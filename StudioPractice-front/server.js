const express = require('express');

const userAgent = require('express-useragent');

const app = express();
const path = require('path');
const helmet = require('helmet');
const mongoose = require("mongoose");
const fs = require('fs');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const multer = require('multer');
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
const dbConnect = require('./db/projects');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(userAgent.express());

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Upload_Images/uploads_projects')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage });

var storage_overview = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Upload_Images/uploads_overviews')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload_overview = multer({ storage: storage_overview });

const uris = [
    'mongodb+srv://deadpoolmillioner:XxiAuNWdwi6VJSH0@mediastudio.cvs0l5p.mongodb.net/?retryWrites=true&w=majority&appName=MediaStudio/images',
    'mongodb+srv://deadpoolmillioner:XxiAuNWdwi6VJSH0@mediastudio.cvs0l5p.mongodb.net/?retryWrites=true&w=majority&appName=MediaStudio/overview',
    'mongodb+srv://deadpoolmillioner:XxiAuNWdwi6VJSH0@mediastudio.cvs0l5p.mongodb.net/?retryWrites=true&w=majority&appName=MediaStudio/admins'
];
const options = {

};
const connections = dbConnect(uris, options);

const projectSchema = require("./Schema/schema")({ collection: "images" });
const overviewSchema = require("./Schema/schema")({ collection: "overviews" });
const adminSchema = require("./Schema/adminSchema")({ collection: "admins" });

const AdminModel = connections.db3.model("Admin", adminSchema);
const ProjectModel = connections.db1.model("Image", projectSchema);
const OverviewModel = connections.db2.model("Image", overviewSchema);
module.exports = {
    AdminModel,
    ProjectModel,
    OverviewModel
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
});

let tg = {
    token: "7115234597:AAGs1wKG5YNXHrMkZqtuglfg86HrIe3ygC4",
    chat_id:"702119813"
}
const nodemailer = require('nodemailer');
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(tg.token, {polling: true});

// app.use(limiter);
//     app.use(helmet());
//     app.use(cookieParser());
//     app.use(
//         helmet.contentSecurityPolicy({
//             directives: {
//                 defaultSrc: ["'self'"],
//                 styleSrc: ["'self'", "'unsafe-inline'", 'maxcdn.bootstrapcdn.com', 'stackpath.bootstrapcdn.com'],
//                 scriptSrc: ["'self'", 'code.jquery.com'],
//             },
//         })
//     );

app.use(express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static('dist'))
app.use('/images', express.static(path.join(__dirname, 'public/images'), {
    maxAge: '1d',    etag: false}));

function sendMessage(text) {
    const url = `https://api.telegram.org/bot${tg.token}/sendMessage?chat_id=${tg.chat_id}&text=${text}`; // The url to request
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    AdminModel.findOne({ username, password })
        .then(async (admin) => {
            if (admin) {
                const images = await ProjectModel.find({});
                const overviews = await OverviewModel.find({});
                const data = {images, overviews};
                res.render('admin', {items: data});
            } else {
                res.status(401).send('Unauthorized');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    const transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: '211151@astanait.edu.kz',
            pass: 'password',
        },
    });

    const mailOptions = {
        from: '211151@astanait.edu.kz',
        to: 'maga.ute@mail.ru',
        subject: 'New Message from Your Website',
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.send('Error sending email');
        } else {
            console.log('Email sent: ' + info.response);
            res.send('Email sent successfully');
        }
    });
});

app.post('/send-message', async (req, res) => {
    const { email, message } = req.body;
    const text = `\nEmail: ${email}  \nMessage: ${message}`;
    bot.sendMessage(tg.chat_id, "You have a new message, do you want to see it? (Yes/No)")
        .then(() => {
            bot.once('message', (msg) => {
                const response = msg.text.toLowerCase();
                if (response === 'yes') {
                    bot.sendMessage(tg.chat_id, text)
                        .then(() => {
                            console.log('Message sent successfully');
                        })
                        .catch((error) => {
                            console.error('Error sending message:', error);
                            res.status(500).send('Error sending message');
                        });
                } else if (response === 'no') {
                    res.send('Message deleted');
                } else {
                    bot.sendMessage(tg.chat_id, "Please respond with 'yes' or 'no'");
                }
            });
        })
        .catch((error) => {
            console.error('Error sending message:', error);
            res.status(500).send('Error sending message');
        });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Main.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'About.html'));
});

app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Booking.html'));
});

app.get('/contacts', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Contacts.html'));
});

app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Main.html'));
});

app.get('/overview', (req, res) => {
    const isMobile = req.useragent.isMobile;
    OverviewModel.find({})
        .then((data, err)=>{
            if(err){
                console.log(err);
            }
            res.render('overview',{items: data, isMobile})
        })
});

app.get('/projects', (req, res) => {
    const isMobile = req.useragent.isMobile;
    ProjectModel.find({})
        .then((data, err)=>{
            if(err){
                console.log(err);
            }
            res.render('projects',{items: data, isMobile})
        })
});
const passport = require('passport');

// Authentication middleware
function authenticate(req, res, next) {
    // Check if the user is authenticated
    if (req.isAuthenticated()) {
        return next(); // User is authenticated, continue to the next middleware/route handler
    }    // User is not authenticated, redirect to login page
    res.redirect('/login');
}

app.post('/login', passport.authenticate('local', {
    successRedirect: '/admin', // Redirect to admin dashboard on successful login
    failureRedirect: '/login', // Redirect back to login page on failed login
}));

app.get('/edit_project/:id', (req, res) => {
    var id = req.params.id;
    ProjectModel.findById(id)
        .then((data, err) => {
            if (err) {
                console.log(err);
            }
            res.render('login', { items: [], image: data }); // Pass 'image' data to the template
        });
});

app.get('/delete_project/:id', (req, res) => {
    var id = req.params.id;
    ProjectModel.findByIdAndDelete(id)
        .then(() => {
            res.redirect('/login');
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
});


app.post('/update_project/:id', upload.single('image'), (req, res) => {
    var id = req.params.id;

    var updateData = {
        name: req.body.name,
        desc: req.body.desc,
        url: req.body.url,
    };

    if (req.file) {
        updateData.img = {
            data: fs.readFileSync(path.join(__dirname + '/Upload_Images/uploads_projects/' + req.file.filename)),
            contentType: 'image/png'
        };
    }

    ProjectModel.findByIdAndUpdate(id, updateData)
        .then((data, err) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/login');
        });
});
app.get('/edit_overview/:id', (req, res) => {
    var id = req.params.id;
    OverviewModel.findById(id)
        .then((data, err) => {
            if (err) {
                console.log(err);
            }
            res.render('login', { items: [], image: data }); // Pass 'image' data to the template
        });
});

app.get('/delete_overview/:id', (req, res) => {
    var id = req.params.id;
    OverviewModel.findByIdAndDelete(id)
        .then(() => {
            res.redirect('/login');
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
});


app.post('/update_overview/:id', upload_overview.single('image'), (req, res) => {
    var id = req.params.id;

    var updateData = {
        name: req.body.name,
        desc: req.body.desc,
        url: req.body.url,
    };

    if (req.file) {
        updateData.img = {
            data: fs.readFileSync(path.join(__dirname + '/Upload_Images/uploads_overviews/' + req.file.filename)),
            contentType: 'image/png'
        };
    }

    OverviewModel.findByIdAndUpdate(id, updateData)
        .then((data, err) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/login');
        });
});


app.post('/upload_Project', upload.single('image'), (req, res, next) => {

    var obj = {
        name: req.body.name,
        desc: req.body.desc,
        url: req.body.url,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/Upload_Images/uploads_projects/' + req.file.filename)),
            contentType: 'image/png'
        }
    }
    ProjectModel.create(obj)
        .then ((err, item) => {
            if (err) {
                console.log(err);
            }
            else {
                // item.save();
                res.redirect('/login');
            }
        });
});
app.post('/upload_Overview', upload_overview.single('image'), (req, res, next) => {

    var obj = {
        name: req.body.name,
        desc: req.body.desc,
        url: req.body.url,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/Upload_Images/uploads_overviews/' + req.file.filename)),
            contentType: 'image/png'
        }
    }
    OverviewModel.create(obj)
        .then ((err, item) => {
            if (err) {
                console.log(err);
            }
            else {
                // item.save();
                res.redirect('/login');
            }
        });
});
const server = app.listen(3000, () => {
    console.log('Server is running at http://localhost:3000/');
});

module.exports = server;
