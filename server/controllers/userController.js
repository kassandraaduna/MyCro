const UserModel = require('../models/User');

const getMed = (req, res) => {
    UserModel.find()
    .then(user => res.json(user))
    .catch(err => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    });
}

const createMed = (req, res) => {
    const newMed = new UserModel(req.body);
    newMed.save()
    .then(user => res.json(user))
    .catch(err => {
        console.error("Error creating user:", err);
        res.status(500).json({ error: "Internal Server Error" });
    });
}

module.exports = { getMed, createMed };
