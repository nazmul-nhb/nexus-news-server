import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { tagCollection } from "../db.js";

const router = express.Router();

// post new tags while posting an article
router.post('/', verifyToken, async (req, res) => {
    const tags = req.body;
    const newTagsToAdd = [];

    for (const tag of tags) {
        if (tag.__isNew__) {
            delete tag.__isNew__;
            const existingTag = await tagCollection.findOne({ value: tag.value });
            if (!existingTag) {
                newTagsToAdd.push(tag);
            }
        }
    }

    if (newTagsToAdd.length > 0) {
        const result = await tagCollection.insertMany(newTagsToAdd);
        res.send(result);
    } else {
        res.send({ message: 'No New Tags to Add' });
    }
});

// get tags in the form as an array of objects with value and label
router.get('/', async (req, res) => {
    const result = await tagCollection.find().toArray();
    res.send(result);
});

export default router;
