const mongoose = require('mongoose')

const MedSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    age: Number,
    username: String,
    password: String,
    email: String,
})

const UserModel = mongoose.model("accounts", MedSchema);

module.exports = UserModel;