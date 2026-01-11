const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


router.get('/getMed', userController.getMed);     
router.post('/addMed', userController.createMed); 

module.exports = router;
