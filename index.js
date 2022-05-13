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
        const bookingCollection = client.db("doctors_portal").collection("bookings");


        console.log('doctor database connected');


        //doctor services 
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)

        })
        app.get('/available', async (req, res) => {
            const date = req.query.date || "May 14th, 2022"

            //set:01 get all service
            const services = await serviceCollection.find().toArray();

            //step: 01 get the booking of the day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray()

            //step: 3 for each service, find booking for that service
            services.forEach(service => {
                const serviceBookings = bookings.filter(b => b.treatment === service.name);

            })


            res.send(bookings);

        })


        /**
         * API naming convention
         * app.get("/booking")  //get all booking 
         * app.get("/booking/:id ") //get specific booking
         * app.post("/booking")//add new booking
         * app.patch("/booking/:id")//  specific single booking
         * app.delete("/booking/:id")//  specific single delete
         * **/


        app.post('/booking', async (req, res) => {
            const booking = req.body;
            //console.log(booking);
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient };
            //console.log(query);
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result })
        })

        // app.post('/booking', async (req, res) => {
        //     const booking = req.body;
        //     const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
        //     const exists = await bookingCollection.findOne(query);
        //     if (exists) {
        //         return res.send({ success: false, booking: exists })
        //     }
        //     const result = await bookingCollection.insertOne(booking);
        //     return res.send({ success: true, result });
        // })




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