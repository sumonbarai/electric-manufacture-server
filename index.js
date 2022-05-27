const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIP_SECRECT_KEY);

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xkgus.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productCollection = client.db("electric").collection("product");
    const orderCollection = client.db("electric").collection("order");
    const reviewCollection = client.db("electric").collection("review");
    const profileinformationCollection = client
      .db("electric")
      .collection("profileinformation");
    const userCollection = client.db("electric").collection("users");

    /* ----------- get api create --------*/

    // get all product in product collection
    app.get("/product", async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get single product by id a product collection
    app.get("/product/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
    // get all order in order collection
    app.get("/order", async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get single order data by id in orderCollection
    app.get("/order/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });
    // get order by filtering user email in order collection
    app.get("/myOrder", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get all review in review collection
    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get single data by email in profileinformation collection
    app.get("/profileinformation", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await profileinformationCollection.findOne(query);
      res.send(result);
    });
    // find users in users collection by search in email
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.roll === "admin";
      res.send({ admin: isAdmin });
    });
    // get all users in users collection
    app.get("/user", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    /* ----------- post api create --------*/
    // post data in order collection
    app.post("/order", async (req, res) => {
      const orderInformation = req.body;
      const result = await orderCollection.insertOne(orderInformation);
      res.send(result);
    });
    // post data in review collection
    app.post("/review", async (req, res) => {
      const customerFeedback = req.body;
      const result = await reviewCollection.insertOne(customerFeedback);
      res.send(result);
    });
    // post data in product collection
    app.post("/product", async (req, res) => {
      const insertedProduct = req.body;
      const result = await productCollection.insertOne(insertedProduct);
      res.send(result);
    });

    /* ----------- update api create --------*/

    // update order by searching order id and put status : success
    app.put("/order/:id", async (req, res) => {
      const id = req.params.id;
      const paymentStatus = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: paymentStatus,
      };
      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    // update data by user in profileinformation collection
    app.put("/profileinformation", async (req, res) => {
      const email = req.query.email;
      const updateData = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: updateData,
      };
      const result = await profileinformationCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    // update user email in database user when login or register
    app.put("/users", async (req, res) => {
      const email = req.query.email;
      const tokenEmail = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: tokenEmail,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const assessToken = jwt.sign(
        tokenEmail,
        process.env.ASSESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, assessToken });
    });
    // update user roll in userCollection database
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const roll = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: roll,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    /* ----------- delete api create --------*/
    // order delete by id search
    app.delete("/order/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
    // product delete by id search
    app.delete("/product/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // strip er api code
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const convertedPrice = price * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: convertedPrice,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running ${port}`);
});
