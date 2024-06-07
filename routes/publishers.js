import express from "express";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";
import { publisherCollection } from "../db.js";
import { ObjectId } from "mongodb";
const router = express.Router();

// get publishers
router.get('/', async (req, res) => {
    // define data limit
    const size = parseInt(req.query.size);

    const result = await publisherCollection.find().limit(size).toArray();
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

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    const publisher_id = req.params.id;
    const query = { _id: new ObjectId(publisher_id) };
    // console.log(publisher_id);
    const result = await publisherCollection.deleteOne(query);
    res.send(result);
})

export default router;
