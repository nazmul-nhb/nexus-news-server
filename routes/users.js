import express from "express";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";
import { userCollection } from "../db.js";

const router = express.Router();

// create and update users on db during register, login & from profile page
router.post('/', async (req, res) => {
    const user = req.body;
    const userExists = await userCollection.findOne({ email: user.email });
    const imageExists = await userCollection.findOne({ email: user.email, profile_image: user.profile_image });
    const roleExists = await userCollection.findOne({ email: user.email, role: { $exists: true } });

    // update profile image and role if there are changes
    if (!imageExists || (!user.profile_image && user.name) || !roleExists) {
        const filter = { email: user.email };
        const options = { upsert: true };
        const updatedUser = { $set: { ...user, role: 'user' } };
        const result = await userCollection.updateOne(filter, updatedUser, options);
        return res.send(result);
    }

    if (userExists) {
        return res.send({ message: 'Profile Up to Date!' });
    }

    const result = await userCollection.insertOne(user);
    res.send(result);
});

// get all users with admin account
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
});

// get single user info
router.get('/single', verifyToken, async (req, res) => {
    const email = req.query.email;
    const result = await userCollection.findOne({ email });
    res.send(result);
});

// make a user admin
router.put('/', verifyToken, verifyAdmin, async (req, res) => {
    const user = req.body;
    const filter = { email: user.email };
    const options = { upsert: true };
    const updatedUser = { $set: user };
    const result = await userCollection.updateOne(filter, updatedUser, options);
    res.send(result);
});

// update user after payment
router.patch('/:email', verifyToken, async (req, res) => {
    const user = req.body;
    const filter = { email: req.params.email };
    const options = { upsert: true };
    const updatedUser = { $set: user };
    const result = await userCollection.updateOne(filter, updatedUser, options);
    res.send(result);
});

// get users count
router.get('/count', async (req, res) => {
    const total_users = await userCollection.countDocuments({});
    const premium_users = await userCollection.countDocuments({ isPremium: true });
    const normal_users = total_users - premium_users;
    res.send({ total_users, normal_users, premium_users });
});

export default router;
