const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors')
const userRoutes = require('./routes/userRoutes')

const  app = express();
app.use(cors());
app.use(express.json())

mongoose.connect('mongodb+srv://adunakass:yoyang20@cluster0.bllodvs.mongodb.net/')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error(err));


app.use('/api/register', userRoutes)


app.listen(8000, () => {
    console.log(`server running`);
});