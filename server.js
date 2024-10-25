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
app.use(express.static(__dirname));  // Serves static files (CSS, JS, images, etc.)
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
}));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/recipeSharing', {
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

// Meal Planner Schema and Model
const mealPlannerSchema = new mongoose.Schema({
    monday: { type: String, required: true },
    tuesday: { type: String, required: true },
    wednesday: { type: String, required: true },
    thursday: { type: String, required: true },
    friday: { type: String, required: true },
    saturday: { type: String, required: true },
    sunday: { type: String, required: true },
});
const MealPlanner = mongoose.model('MealPlanner', mealPlannerSchema);

// Recipe Schema and Model
const recipeSchema = new mongoose.Schema({
    title: String,
    ingredients: [String],  // Accepts an array of strings
    instructions: String,
    image: String
});
const Recipe = mongoose.model('Recipe', recipeSchema, 'shareRecipes');

// Store Schema and Model
const storeSchema = new mongoose.Schema({
    storeName: { type: String, required: true },
    storeDescription: { type: String, required: true },
    storeLocation: { type: String, required: true },
    storeImage: { type: String, required: true },
});
const Store = mongoose.model('Store', storeSchema);

// Routes
// Serve HTML pages
app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/meal-planner', (req, res) => {
    res.sendFile(path.join(__dirname, 'meal-planner.html'));
});

app.get('/browse-recipes', (req, res) => {
    res.sendFile(path.join(__dirname, 'browse-recipes.html'));
});

app.get('/saved-recipes', (req, res) => {
    res.sendFile(path.join(__dirname, 'saved-recipes.html'));
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Check if user exists
    const userExists = await User.findOne({ username });
    if (userExists) {
        return res.redirect('/register?error=user_exists');
    }

    // Hash the password and save
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

    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
        return res.redirect('/login?error=invalid_user');
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.redirect('/login?error=invalid_password');
    }

    // Save user session
    req.session.user = user;

    // Redirect to the Meal Planner page after successful login
    res.redirect('/index');
});

// Handle meal plan submission
app.post('/meal-planner', async (req, res) => {
    const mealPlan = new MealPlanner(req.body);
    try {
        await mealPlan.save();
        res.status(200).send('Meal plan saved successfully!');
    } catch (error) {
        console.error('Error saving to MongoDB:', error);
        res.status(500).send('Error saving meal plan to MongoDB');
    }
});

// Handle recipe submission
app.post('/submit-recipe', async (req, res) => {
    const { title, ingredients, instructions, image } = req.body;
    
    try {
        const newRecipe = new Recipe({
            title,
            ingredients,
            instructions,
            image
        });
        
        await newRecipe.save();
        res.status(200).send('Recipe saved successfully');
    } catch (error) {
        console.error('Error saving recipe:', error);
        res.status(500).send('Failed to save recipe');
    }
});

// Handle store submission
app.post('/add-store', async (req, res) => {
    const { storeName, storeDescription, storeLocation, storeImage } = req.body;

    const newStore = new Store({
        storeName,
        storeDescription,
        storeLocation,
        storeImage,
    });

    try {
        await newStore.save();
        res.status(200).send('Store added successfully');
    } catch (error) {
        console.error('Error saving store:', error);
        res.status(500).send('Failed to add store');
    }
});

// Route to get saved recipes, meal plans, and stores
app.get('/api/savedData', async (req, res) => {
    try {
        const savedRecipes = await Recipe.find(); // Fetch all recipes
        const mealPlans = await MealPlanner.find(); // Fetch all meal plans
        const stores = await Store.find(); // Fetch all stores
        res.status(200).json({ success: true, savedRecipes, mealPlans, stores });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching saved data', error });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); 
});
