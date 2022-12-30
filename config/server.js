const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const app = express();
const port = process.env.PORT || 5500;
const cors = require('cors');
const { client } = require('./database.js');
const db = client.db("cashier");
const validator = require('../src/js/validator');

let initialPath = path.join(__dirname, '../src/');

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(initialPath, { index: 'login.html' }));
app.use(
    session({
        resave: false,
        saveUninitialized: false,
        secret: 'secret',
        name: 'secretName',
        cookie: {
            sameSite: true,
            maxAge: 60000,
        },
    })
);

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.status(200).sendFile(path.join(initialPath, 'login'));
});

app.get('/dashboard', (req, res) => {
    res.render('../src/dashboard', { selected: 'dashboard', name: req.session.name, profession: req.session.merchant });
});

app.get('/kasir', (req, res) => {
    res.render('../src/kasir', { selected: 'kasir', name: req.session.name, profession: req.session.merchant });
});

app.get('/notif', (req, res) => {
    res.render('../src/notif', { selected: 'notif', name: req.session.name, profession: req.session.merchant });
});

app.get('/pendapatan', (req, res) => {
    res.render('../src/pendapatan', { selected: 'pendapatan', name: req.session.name, profession: req.session.merchant });
});

app.get('/stock', (req, res) => {
    res.render('../src/stock', { selected: 'stock', name: req.session.name, profession: req.session.merchant });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    //check fields 
    if (!email || !password) {
        return res.json('fill in all the fields');
    }
    //check email validity
    if (!validator.isValidEmail(email)) {
        return res.json('invalid email, insert real email address');
    }
    //check password validity
    if (!validator.isValidPassword(password)) {
        return res.json('invalid password');
    }
    // Find a user with the specified email and password in the "users" collection
    db.collection('users').findOne(
        { email, password },
        (err, result) => {
            if (err) {
                res.json(err);
            } else {
                if (result) {
                    // If a user is found, set a session variable with the user's email
                    req.session.email = email;
                    req.session.name = result.name;
                    req.session.merchant = result.merchant;

                    // Save the session to a cookie
                    req.session.save((err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            // If the session was saved successfully, return the user's data
                            res.send(result);
                        }
                    });
                } else {
                    // If no user is found, return an error message
                    res.json('Invalid email or password');
                }
            }
        }
    );
});

app.get('/api/checkSession', (req, res) => {
    if (req.session.email) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.json(err);
        } else {
            res.json({ loggedOut: true });
        }
    });
});


app.get('/api/readData', (req, res) => {
    // Find all documents in the "users" collection
    db.collection('users')
        .find({})
        .toArray((err, result) => {
            if (err) {
                return res.json(err);
            }
            res.send(result);
            console.log(result);
        });
});

app.get('/api/readUser', (req, res) => {
    // Find a user with the specified email and password in the "users" collection
    db.collection('users').findOne(
        { email: userEmail },
        (err, result) => {
            if (err) {
                res.json(err);
            } else {
                if (res.length > 0) {
                }
                res.send(result);
                console.log(result);
            }
        }
    );
});

app.post('/api/createUser', (req, res) => {
    const { name, merchant, email, password, rptpassword } = req.body;
    // Check if any of the required fields are empty
    if (!name || !email || !merchant || !password || !rptpassword) {
        return res.json('fill in all the fields');
    }
    //check email validity
    if (!validator.isValidEmail(email)) {
        return res.json('invalid email, insert real email address');
    }
    //check password validity
    if (!validator.isValidPassword(password)) {
        return res.json('invalid password');
    }
    //check matching password
    if (!rptpassword.match(password)) {
        return res.json('password not match');
    }
    db.collection('users').insertOne(
        { name, merchant, email, password },
        (err, result) => {
            if (err) {
                if (err.code === 11000) {
                    return res.json("Duplicate email, please login")
                }
                res.json(err.message);
            } else {
                res.send(result);
                console.log(result);
            }
        }
    );
});

app.put('/api/updateUser', (req, res) => {
    const userName = req.body.nama;
    const userMerchant = req.body.namaMerchant;
    const userPassword = req.body.password;
    const userEmail = req.body.email;
    // Update the user with the specified email in the "users" collection
    db.collection('users').updateOne(
        { email: userEmail },
        {
            $set: {
                name: userName,
                password: userPassword,
                merchant: userMerchant,
            },
        },
        (err, result) => {
            if (err) {
                return res.json(err);
            }
            res.send(result);
            console.log(result);
        }
    );
});


app.delete('/api/deleteUser', (req, res) => {
    const userEmail = req.body.email;
    // Delete the user with the specified email from the "users" collection
    db.collection('users').deleteOne({ email: userEmail }, (err, result) => {
        if (err) {
            return res.json(err);
        }
        res.send(result);
        console.log(result);
    });
});

app.listen(port, () => {
    console.log(`app listening on port ${port}!`);
});