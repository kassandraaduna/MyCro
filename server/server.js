require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes'); 
const lessonRoutes = require('./routes/lessonRoutes');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://adunakass:yoyang20@cluster0.bllodvs.mongodb.net/')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

app.use('/api', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', assessmentRoutes); 
app.use('/api', lessonRoutes);
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
