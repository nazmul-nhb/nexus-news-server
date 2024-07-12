import express from "express";
import Stripe from 'stripe';
import { paymentCollection } from "../db.js";
import { verifyAdmin, verifyToken } from "../middlewares/auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET);

const router = express.Router();


// get aggregated subscription data for bar chart
router.get('/subscription-stats', verifyToken, verifyAdmin, async (req, res) => {
    const result = await paymentCollection.aggregate([
        {
            $match: {
                status: "paid"
            }
        },
        {
            $group: {
                _id: "$plan",
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                plan: "$_id",
                count: 1
            }
        },
        {
            $sort: { count: -1 }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$count" },
                plans: { $push: "$$ROOT" }
            }
        },
        {
            $unwind: "$plans"
        },
        {
            $project: {
                plan: "$plans.plan",
                count: "$plans.count",
                percentage: {
                    $multiply: [
                        { $divide: ["$plans.count", "$total"] },
                        100
                    ]
                }
            }
        }
    ]).toArray();

    // console.log('Aggregation result:', result);

    res.send(result);
});

// get revenue vs plans data for graph
router.get('/revenue-by-plan', verifyToken, verifyAdmin, async (req, res) => {

    const result = await paymentCollection.aggregate([
        {
            $match: {
                status: "paid"
            }
        },
        {
            $group: {
                _id: "$plan",
                revenue: { $sum: "$price" }
            }
        },
        {
            $project: {
                _id: 0,
                plan: "$_id",
                revenue: 1
            }
        }
    ]).toArray();
    console.log('Revenue by plan:', result);
    res.send(result);

});

// post payment
router.post('/', verifyToken, async (req, res) => {
    const paymentInfo = req.body;
    const user = req.user;

    // check if user has pending plan
    const isPendingPlan = await paymentCollection.findOne({ user: user?.email, status: 'pending' });

    // update pending payment if find any
    if (isPendingPlan) {
        const updated = await paymentCollection.updateOne(
            { user: user?.email },
            { $set: { ...paymentInfo } },
            { upsert: true }
        )
        // console.log(updated);
        return res.send(updated);
    }

    const result = await paymentCollection.insertOne(paymentInfo);
    res.send(result);
});

// get single user's pending payment info
router.get('/:email', verifyToken, async (req, res) => {
    const filter = { user: req.params.email, status: 'pending' };

    const result = await paymentCollection.findOne(filter);

    res.send(result);
});

// update payment info after successful transaction
router.patch('/:email', verifyToken, async (req, res) => {
    const paymentInfo = req.body;
    const filter = { user: req.params.email, status: 'pending' };
    const options = { upsert: true };
    const updatedInfo = { $set: paymentInfo };

    const result = await paymentCollection.updateOne(filter, updatedInfo, options);

    res.send(result);
});

// payment intent for stripe
router.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    console.log(amount, 'amount inside the intent')

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
    });

    res.send({
        clientSecret: paymentIntent.client_secret
    })
});

export default router;