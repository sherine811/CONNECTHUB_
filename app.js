const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from the current directory
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
}));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/knowYourNeighbor', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected');
}).catch(err => console.error('MongoDB connection error:', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String
});
const User = mongoose.model('User', userSchema);

// Store Schema and Model
const storeSchema = new mongoose.Schema({
    name: String,
    description: String,
    location: String,
    image: String
});
const Store = mongoose.model('Store', storeSchema);

// Weekend Plan Schema and Model
const weekendPlanSchema = new mongoose.Schema({
    saturday: String,
    sunday: String
});
const WeekendPlan = mongoose.model('WeekendPlan', weekendPlanSchema);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Serve index.html on root
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/add-store', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-store.html'));
});

app.get('/weekend-events', (req, res) => {
    res.sendFile(path.join(__dirname, 'weekend-events.html'));
});

app.get('/store', (req, res) => {
    res.sendFile(path.join(__dirname, 'store.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) {
        return res.redirect('/register?error=user_exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });

    try {
        await newUser.save();
        res.redirect('/login?success=registered');
    } catch (err) {
        console.error('Error saving user:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
        return res.redirect('/login?error=invalid_user');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.redirect('/login?error=invalid_password');
    }

    req.session.user = user;
    res.redirect('/index');
});

// Handle store submission
app.post('/submit-store', async (req, res) => {
    const { storeName, storeDescription, storeLocation, storeImage } = req.body;
    const newStore = new Store({
        name: storeName,
        description: storeDescription,
        location: storeLocation,
        image: storeImage,
    });

    try {
        await newStore.save();
        res.status(200).send('Store added successfully!');
    } catch (error) {
        console.error('Error saving store:', error);
        res.status(500).send('Error saving store to MongoDB: ' + error.message);
    }
});


// Handle weekend plan submission
app.post('/weekend-plan', async (req, res) => {
    const { saturday, sunday } = req.body;
    const newWeekendPlan = new WeekendPlan({ saturday, sunday });

    try {
        await newWeekendPlan.save();
        res.status(200).send('Weekend plan saved successfully!');
    } catch (error) {
        console.error('Error saving weekend plan:', error);
        res.status(500).send('Error saving weekend plan to MongoDB: ' + error.message);
    }
});

// Route to get saved stores and weekend plans
app.get('/api/savedData', async (req, res) => {
    try {
        const stores = await Store.find(); // Fetch all stores
        const weekendPlans = await WeekendPlan.find(); // Fetch all weekend plans
        res.status(200).json({ success: true, stores, weekendPlans });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching saved data', error });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); 
});
