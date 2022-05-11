const express = require('express');
const cors = require('cors');
require('dotenv').config();
var MongoClient = require('mongodb').MongoClient;
const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json())

//doctor_admin
//xRoc5tyvJk2pIaiH


var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-shard-00-00.zsna7.mongodb.net:27017,cluster0-shard-00-01.zsna7.mongodb.net:27017,cluster0-shard-00-02.zsna7.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-c4fdfz-shard-0&authSource=admin&retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        console.log('doctor database connected');


        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)

        })
    } finally {

    }
}



run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from Doctor server!')
})

app.listen(port, () => {
    console.log(`Doctor app listening on port ${port}`)
})