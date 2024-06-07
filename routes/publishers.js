import express from "express";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";
import { publisherCollection } from "../db.js";

const router = express.Router();

// get publishers
router.get('/', async (req, res) => {
    const result = await publisherCollection.find().toArray();
    res.send(result);
});

// create publisher with admin account(s)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    const publisher = req.body;
    const publisherExists = await publisherCollection.findOne({ publisher: publisher.publisher });
    if (publisherExists) {
        return res.send({ message: 'Publisher Already Exists!' });
    }
    const result = await publisherCollection.insertOne(publisher);
    res.send(result);
});

export default router;
