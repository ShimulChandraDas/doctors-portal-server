const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
var MongoClient = require('mongodb').MongoClient;


var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');

const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json())

//doctor_admin
//xRoc5tyvJk2pIaiH


var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-shard-00-00.zsna7.mongodb.net:27017,cluster0-shard-00-01.zsna7.mongodb.net:27017,cluster0-shard-00-02.zsna7.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-c4fdfz-shard-0&authSource=admin&retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

function verifyJWT(req, res, next) {
    //console.log('abc');
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorization Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        console.log(decoded);
        req.decoded = decoded;
        next();
    })


}

const emailSenderOptions = {
    auth: {

        api_key: process.env.EMAIL_SENDER_KEY
    }
}

const emailClient = nodemailer.createTransport(sgTransport(emailSenderOptions));
function sendAppointmentEmail(booking) {
    const { patient, patientName, date, slot } = booking;


    var email = {
        from: process.env.EMAIL_SENDER,
        to: patient,
        subject: `your Appointment fro ${treatment} is on ${date} at ${slot} is confirmed `,
        text: `your Appointment fro ${treatment} is on ${date} at ${slot} is confirmed `,
        html: `
      <div>
        <p> Hello ${patientName}, </p>
        <h3>Your Appointment for ${treatment} is confirmed</h3>
        <p>Looking forward to seeing you on ${date} at ${slot}.</p>
        
        <h3>Our Address</h3>
        <p>Andor Killa Bandorban</p>
        <p>Bangladesh</p>
        <a href="https://web.programming-hero.com/">unsubscribe</a>
      </div>   
        `
    };

    emailClient.sendMail(email, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Message sent: ', info);
        }
    });

}



async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("bookings");
        const userCollection = client.db("doctors_portal").collection("users");
        const doctorCollection = client.db("doctors_portal").collection("doctors");
        console.log('doctor database connected');
        //multiple middleware function
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({ message: 'Forbidden Access' })
            }

        }




        //doctor services 
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).project({ name: 1 });
            const services = await cursor.toArray();
            res.send(services)
        });


        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });





        //not proper way
        //after learning more about mongodb.use aggregate lookup, pipeline, match, group
        app.get('/available', async (req, res) => {
            const date = req.query.date || "May 14th, 2022";

            //set:01 get all service
            const services = await serviceCollection.find().toArray();

            // //step: 01 get the booking of the day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // //step: 3 for each service, find booking for that service
            services.forEach(service => {
                const serviceBookings = bookings.filter(book => book.treatment === service.name);
                const bookedSlots = serviceBookings.map(book => book.slot);
                //service.booked = booked
                //service.booked = serviceBookings.map(s => s.slot)
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                service.slots = available;


            })
            res.send(services);
        })


        /**
         * API naming convention
         * app.get("/booking")  //get all booking 
         * app.get("/booking/:id ") //get specific booking
         * app.post("/booking")//add new booking
         * app.patch("/booking/:id")//  specific single booking
         * app.delete("/booking/:id")//  specific single delete
         * **/





        app.get('/booking', verifyJWT, async (req, res) => {
            const patient = req.query.patient;
            //const authorization = req.headers.authorization;
            //console.log('authorization token', authorization);
            const decodedEmail = req.decoded.email;
            if (patient === decodedEmail) {
                const query = { patient: patient };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            } else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }


        })


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

            sendAppointmentEmail(booking);

            return res.send({ success: true, result })
        })

        //load doctor in manage doctor
        app.get('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
            const doctors = await doctorCollection.find().toArray();;
            res.send(doctors)
        })

        //add doctor

        app.post('/doctor', verifyJWT, async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            res.send(result);
        })
        //delete doctor
        app.delete('/doctor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const result = await doctorCollection.deleteOne(filter)
            res.send(result);
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