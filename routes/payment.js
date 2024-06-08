import express from "express";
import Stripe from 'stripe';
import { paymentCollection } from "../db.js";
import { verifyToken } from "../middlewares/auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET);

const router = express.Router();

// post payment
router.post('/', verifyToken, async (req, res) => {
    const paymentInfo = req.body;
    const user = req.user;

    // check if user have pending plan
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