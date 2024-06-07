import express from "express";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";
import { articleCollection } from "../db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// post an article 
router.post('/', verifyToken, async (req, res) => {
    const article = req.body;
    const articleExists = await articleCollection.findOne({ headline: article.headline });

    if (articleExists) {
        return res.send({ message: 'Article Already Exists!' });
    }

    const result = await articleCollection.insertOne(article);
    res.send(result);
});

// get all articles
router.get('/', async (req, res) => {
    const size = parseInt(req.query.size);
    let sortBy = {};
    switch (req.query.sort) {
        case 'view_descending':
            sortBy = { view_count: -1 };
            break;
        case 'view_ascending':
            sortBy = { view_count: 1 };
            break;
        case 'time_descending':
            sortBy = { posted_on: -1 };
            break;
        case 'time_ascending':
            sortBy = { posted_on: 1 };
            break;
        case 'title_descending':
            sortBy = { headline: -1 };
            break;
        case 'title_ascending':
            sortBy = { headline: 1 };
            break;
        default:
            sortBy = {};
            break;
    }

    let filter = { status: "Approved" };
    if (req.query.tag && req.query.tag !== 'undefined') {
        filter.tags = Array.isArray(req.query.tag) ? { $in: req.query.tag } : req.query.tag;
    }
    if (req.query.publisher && req.query.publisher !== 'undefined') {
        filter.publisher = req.query.publisher;
    }
    if (req.query.search) {
        filter.headline = { $regex: req.query.search, $options: "i" };
    }

    const result = await articleCollection.find(filter).sort(sortBy).limit(size).toArray();
    res.send(result);
});

// get all articles for admin
router.get('/all', verifyToken, verifyAdmin, async (req, res) => {
    // define limit
    const size = parseInt(req.query.size);

    // manage sort query from client
    let sortBy = {};
    switch (req.query.sort) {
        case 'view_descending':
            sortBy = { view_count: -1 }
            break;
        case 'view_ascending':
            sortBy = { view_count: 1 }
            break;
        case 'time_descending':
            sortBy = { posted_on: -1 }
            break;
        case 'time_ascending':
            sortBy = { posted_on: 1 }
            break;
        case 'title_descending':
            sortBy = { headline: -1 }
            break;
        case 'title_ascending':
            sortBy = { headline: 1 }
            break;

        default:
            sortBy = {};
            break;
    }

    let filter = { status: "Approved" };

    // filter by tag query from client
    if (req.query.tag && req.query.tag !== 'undefined') {
        if (Array.isArray(req.query.tag)) {
            filter.tags = { $in: req.query.tag };
        } else {
            filter.tags = req.query.tag;
        }
    }

    // filter by publisher
    if (req.query.publisher && req.query.publisher !== 'undefined') {
        filter.publisher = req.query.publisher;
    }
    // search in article headlines/titles
    if (req.query.search) {
        filter.headline = { $regex: req.query.search, $options: "i" };
    }

    // make extra secured
    if (req.query.role === 'admin') {
        delete filter.status;
    }

    const include = {
        _id: 1, headline: 1, posted_by_email: 1, posted_on: 1, status: 1, publisher: 1, isPremium: 1
    };

    const result = await articleCollection.find(filter).sort(sortBy).project(include).limit(size).toArray();

    res.send(result);
});

// get single article for users
router.get('/:id', verifyToken, async (req, res) => {
    const article_id = req.params.id;
    const filter = { _id: new ObjectId(article_id) };
    const updateViewCount = { $inc: { view_count: 1 } };

    await articleCollection.updateOne(filter, updateViewCount);
    const result = await articleCollection.findOne(filter);
    res.send(result);
});

// get user's own articles
router.get('/user/:email', verifyToken, async (req, res) => {
    const user_email = req.params.email;
    const filter = { posted_by_email: user_email };
    const result = await articleCollection.find(filter).toArray();
    res.send(result);
});

// delete user's article
router.delete('/:id', verifyToken, async (req, res) => {
    const article_id = req.params.id;
    const user_email = req.query.email;
    const query = { _id: new ObjectId(article_id), posted_by_email: user_email };
    const result = await articleCollection.deleteOne(query);
    res.send(result);
});

// update article
router.patch('/:id', async (req, res) => {
    const article_id = req.params.id;
    const filter = { _id: new ObjectId(article_id) };
    const updatedArticle = { $set: req.body };
    const options = { upsert: true };
    const result = await articleCollection.updateOne(filter, updatedArticle, options);
    res.send(result);
});

export default router;
