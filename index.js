require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const jwtSecretKey = "dkjfdjgrfgjjrgdhahdkhfkdhfkldnfkjuedhfhf";

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gaxw2ro.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client
      .db("backendTaskAuthentication")
      .collection("users");
    const hotelCollection = client
      .db("backendTaskAuthentication")
      .collection("hotels");

    app.get("/hotels", async (req, res) => {
      const result = await hotelCollection.find().toArray();
      res.send(result);
    });

    app.post("/register", async (req, res) => {
      const userData = req.body;
      console.log(userData);
      try {
        const existingUser = await usersCollection.findOne({
          email: userData.email,
        });
        const hashedPassword = bcrypt.hashSync(userData.password, 10);
        userData.password = hashedPassword;
        if (existingUser) {
          res.status(400).send({
            message: "Email already exists. Please choose a different email.",
          });
        } else {
          const result = await usersCollection.insertOne(userData);
          res.send(result);
        }
      } catch (error) {
        res.status(500).send({ error: "An error occurred" });
      }
    });

    app.post("/login", async (req, res) => {
      const loginData = req.body;
      console.log(loginData);
      try {
        const user = await usersCollection.findOne({
          email: loginData.email,
        });
        if (user) {
          const passwordMatch = bcrypt.compareSync(
            loginData.password,
            user.password
          );
          if (passwordMatch) {
            jwt.sign(
              { email: user.email, userId: user._id },
              jwtSecretKey,
              { expiresIn: "1h" },
              (err, token) => {
                if (err) {
                  console.error("Error signing token:", err);
                  res.status(500).send({ error: "An error occurred" });
                } else {
                  res.cookie("token", token, {
                    httpOnly: true,
                    maxAge: 3600000,
                  });
                  res
                    .status(200)
                    .send({ user, message: "Login successful", token });
                }
              }
            );
          } else {
            res.status(401).send({ message: "Invalid password" });
            return;
          }
        } else {
          res.status(401).send({ message: "User not found" });
          return;
        }
      } catch (error) {
        res.status(500).send({ error: "An error occurred" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Authentication server is running");
});

app.listen(port, () => {
  console.log(`Authentication server is running on ${port}`);
});
