import express from "express";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";
import { articleCollection, userCollection } from "../db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// post an article 
router.post('/', verifyToken, async (req, res) => {
    const user = req.user;
    const article = req.body;

    // check if article already exists
    const articleExists = await articleCollection.findOne({ headline: article.headline });

    // check if a user is a free user
    const isFreeUser = await userCollection.findOne({ email: user.email, isPremium: false || null });
    // check if a user is an admin
    const isAdmin = await userCollection.findOne({ email: user.email, role: "admin" });
    // if a free user (but not admin) has posted 1 blog don't allow to post any more article
    if (isFreeUser && !isAdmin) {
        const articleCount = await articleCollection.countDocuments({ posted_by_email: user.email });
        if (articleCount >= 1) {
            return res.send({ message: 'Only Premium Users can post more than 1 Article!' });
        }
    }

    // check duplicate entries with headline
    if (articleExists) {
        return res.send({ message: 'Article Already Exists!' });
    }

    const result = await articleCollection.insertOne(article);
    res.send(result);
});

// get all approved articles for everyone
router.get('/', async (req, res) => {
    // define data limit
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

    // filter get premium articles
    if (req.query.isPremium === 'true') {
        filter.isPremium = true;
    }

    // search in article headlines/titles
    if (req.query.search) {
        filter.headline = { $regex: req.query.search, $options: "i" };
    }

    // console.log(filter);
    
    // if (req.query.role === 'admin') {
    //     delete filter.status;
    // }

    const result = await articleCollection.find(filter).sort(sortBy).limit(size).toArray(); // exclude description after getting assignment result

    res.send(result);
});

// get all articles for admin
router.get('/all', verifyToken, verifyAdmin, async (req, res) => {
    // define limit
    const page = parseInt(req.query.page);
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

    let filter = {};

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

    const include = {
        _id: 1, headline: 1, posted_by_email: 1, posted_on: 1, status: 1, publisher: 1, isPremium: 1
    };

    const result = await articleCollection.find(filter).sort(sortBy).skip(page * size).project(include).limit(size).toArray();

    res.send(result);
});

// get total article count
router.get(`/article-count`, verifyToken, verifyAdmin, async (req, res) => {
    const count = await articleCollection.countDocuments();

    res.send({ count });
});

// get publishers's percentage data for pie chart
router.get('/publication-percentages', verifyToken, verifyAdmin, async (req, res) => {
    const aggregationPipeline = [
        {
            $group: {
                _id: "$publisher",
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$count" },
                publications: {
                    $push: {
                        publisher: "$_id",
                        count: "$count"
                    }
                }
            }
        },
        {
            $unwind: "$publications"
        },
        {
            $project: {
                _id: 0,
                publication: "$publications.publisher",
                percentage: {
                    $multiply: [
                        { $divide: ["$publications.count", "$total"] },
                        100
                    ]
                }
            }
        }
    ];

    const publicationPercentages = await articleCollection.aggregate(aggregationPipeline).toArray();

    res.send(publicationPercentages);
});

// get single article for verified users to see details
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

    // filter with both id and email to be more sure
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
