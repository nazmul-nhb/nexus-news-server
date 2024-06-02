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



// MongoDB Codes:

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




        app.post('/users', async (req, res) => {
            const user = req.body;
            const userExists = await userCollection.findOne({ email: user.email });
            const imageExists = await userCollection.findOne({ profile_image: user.profile_image });

            // update profile image
            if (!imageExists) {
                const filter = { email: user.email };
                const options = { upsert: true };
                const updatedUser = { $set: { profile_image: user.profile_image } };
                const result = await userCollection.updateOne(filter, updatedUser, options);

                return res.send(result);
            }

            if (userExists) {
                return res.send({ message: 'User Already Exists!' })
            }

            const result = await userCollection.insertOne(user);

            res.send(result);
        })

        // post an article 
        app.post('/articles', async (req, res) => {
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

                default:
                    sortBy = {};
                    break;
            }

            let filter = {};
            // filter by tag query from client
            if (req.query.tag) {
                filter.tags = req.query.tag;
            }
            // filter by publisher
            if (req.query.publisher) {
                filter.publisher = req.query.publisher;
            }
            // search in article headlines/titles
            if (req.query.search) {
                filter.headline = { $regex: req.query.search, $options: "i" };
            }


            const result = await articleCollection.find(filter).sort(sortBy).project({ description: 0 }).toArray();

            res.send(result);
        })

        // get publishers
        app.get('/publishers', async (req, res) => {
            const result = await publisherCollection.find().toArray();

            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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