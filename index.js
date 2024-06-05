import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

dotenv.config();

const corsOptions = [
    'http://localhost:5173',
    'http://localhost:5174',
];

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors({ origin: corsOptions }));
app.use(express.json());

const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access!' });
    }

    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, process.env.TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: 'Unauthorized Access!' })
        }
        req.user = decoded;
        next();
    })
}

// MongoDB Codes

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qmbsuxs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const run = async () => {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db("nexusDB").collection("users");
        const publisherCollection = client.db("nexusDB").collection("publishers");
        const articleCollection = client.db("nexusDB").collection("articles");
        const tagCollection = client.db("nexusDB").collection("tags");


        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // verifyAdmin middleware
        const verifyAdmin = async (req, res, next) => {
            const user = req.user;
            const query = { email: user?.email };
            const result = await userCollection.findOne(query);

            console.log(result?.role);

            if (!result || result?.role !== 'admin')
                return res.status(401).send({ message: 'Unauthorized Access!' });

            next();
        }

        // create and update users on db during register, login & from profile page
        app.post('/users', async (req, res) => {
            const user = req.body;
            const userExists = await userCollection.findOne({ email: user.email });
            const imageExists = await userCollection.findOne({ email: user.email, profile_image: user.profile_image });
            const roleExists = await userCollection.findOne({ email: user.email, role: { $exists: true } });
            console.log('role checking: ', roleExists);
            // update profile image
            if (!imageExists || (!user.profile_image && user.name) || !roleExists) {
                const filter = { email: user.email };
                const options = { upsert: true };
                const updatedUser = { $set: { ...user, role: 'user' } };
                const result = await userCollection.updateOne(filter, updatedUser, options);

                console.log('updated: ', result);

                return res.send(result);
            }

            if (userExists) {
                return res.send({ message: 'Profile Up to Date!' })
            }

            const result = await userCollection.insertOne(user);

            res.send(result);
        });

        // get all users with admin account
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();

            res.send(result);
        });

        // get single user info
        app.get('/users/single', verifyToken, async (req, res) => {
            const email = req.query.email;

            const result = await userCollection.findOne({ email });
            res.send(result);
        });

        // make a user admin
        app.put('/users', verifyToken, async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const options = { upsert: true };
            const updatedUser = { $set: { ...user, admin_since: Date.now() } };

            const result = await userCollection.updateOne(query, updatedUser, options);

            res.send(result);
        })

        // post an article 
        app.post('/articles', verifyToken, async (req, res) => {
            const article = req.body;
            const articleExists = await articleCollection.findOne({ headline: article.headline });

            if (articleExists) {
                return res.send({ message: 'Article Already Exists!' })
            }

            const result = await articleCollection.insertOne(article);

            res.send(result);
        })

        // get articles
        app.get('/articles', async (req, res) => {
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
            // search in article headlines/titles
            if (req.query.search) {
                filter.headline = { $regex: req.query.search, $options: "i" };
            }
            console.log(filter);
            delete filter.status; // remove this line after admin arrives :D
            const result = await articleCollection.find(filter).sort(sortBy).limit(size).toArray(); // exclude description after getting assignment result

            res.send(result);
        });

        // get single article
        app.get('/articles/:id', async (req, res) => {
            const article_id = req.params.id;
            const filter = { _id: new ObjectId(article_id) };
            const updateViewCount = { $inc: { view_count: 1 } };

            await articleCollection.updateOne(filter, updateViewCount);

            const result = await articleCollection.findOne(filter);

            res.send(result);
        });

        // get user's articles
        app.get('/user/articles/:email', verifyToken, async (req, res) => {
            const user_email = req.params.email;
            const filter = { posted_by_email: user_email };

            const result = await articleCollection.find(filter).toArray();

            res.send(result);
        });

        // delete user's article
        app.delete('/articles/:id', verifyToken, async (req, res) => {
            const article_id = req.params.id;
            const user_email = req.query.email;
            const query = { _id: new ObjectId(article_id), posted_by_email: user_email };

            const result = await articleCollection.deleteOne(query);

            res.send(result);
        });

        // get publishers
        app.get('/publishers', async (req, res) => {
            const result = await publisherCollection.find().toArray();

            res.send(result);
        })

        // post new tags while posting an article
        app.post('/tags', verifyToken, async (req, res) => {
            const tags = req.body;
            const newTagsToAdd = [];

            // filter new tags
            for (const tag of tags) {
                if (tag.__isNew__) {
                    delete tag.__isNew__;
                    const existingTag = await tagCollection.findOne({ value: tag.value });
                    if (!existingTag) {
                        newTagsToAdd.push(tag);
                    }
                }
            }

            console.log(newTagsToAdd);

            const result = await tagCollection.insertMany(newTagsToAdd);

            res.send(result);
        });

        // get tags in the form as an array of objects with value and label
        app.get('/tags', async (req, res) => {
            const result = await tagCollection.find().toArray();

            res.send(result);
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Successfully Connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
    res.send("Nexus Server is Running!");
});

app.listen(port, () => {
    console.log(`Nexus Server is Running on Port: ${port}`);
});