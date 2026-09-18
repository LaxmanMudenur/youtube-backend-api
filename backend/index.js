const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

require('dotenv').config()
const port = 3000


//user schema
const userSchema = new mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
})

//profile Schema
const profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
  address: {
        type: String
    },
    phone: {
        type: String
    },
    city: {
        type: String
    },
    country: {
        type: String
    }
})

//channel
const channelSchema = new mongoose.Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    channelBio: {
        type: String
    }
})

//Article
const articleSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel'
    },
    title: {
        type: String,
    },
    link: {
        type: String,

    },
    description: {
        type: String
    }
});
// category

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
    },
    description: {
        type: String
    }
});

//category channel
const categoryChannelSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
    }
});

const User = mongoose.model("User", userSchema)
const Profile = mongoose.model("Profile", profileSchema)
const Channel = mongoose.model("Channel", channelSchema)
const Article = mongoose.model("Article", articleSchema)
const Category = mongoose.model("Category", categorySchema)
const CategoryChannel = mongoose.model("CategoryChannel", categoryChannelSchema)

//middleware for user Schema validation
const userSchemaValidation = Joi.object({
    name: Joi.string().required(),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.empty': 'Email address is required.',
            'string.email': 'Please enter a valid email address.',
            'any.required': 'Email address is required.'
        }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Password is required.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.'
    })
})

const loginSchemaValidation = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.empty': 'Email address is required.',
            'string.email': 'Please enter a valid email address.',
            'any.required': 'Email address is required.'
        }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Password is required.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.'
    })
})

const profileValidation = Joi.object({
  address: Joi.string().allow("", null),
  phone: Joi.string().allow("", null),
  city: Joi.string().allow("", null),
  country: Joi.string().allow("", null),
});

const channelValidation = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow("", null),
  channelBio: Joi.string().allow("", null),
});

const articleValidation = Joi.object({
  channel: Joi.string().hex().length(24).required(),
  title: Joi.string().required(),
  link: Joi.string().uri().allow("", null),
  description: Joi.string().allow("", null),
});

const categoryValidation = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow("", null),
});

const categoryChannelValidation = Joi.object({
  category: Joi.string().hex().length(24).required(),
  channel: Joi.string().hex().length(24).required(),
});

const validate = (schema, body) => {
  const { error, value } = schema.validate(body, { abortEarly: true });
  if (error) {
    return { error: error.details[0].message };
  }
  return { value };
};

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  return user;
};

//authorization middeleware
const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token required" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized request" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};


//connect to mongoDB
mongoose.connect(process.env.MongoDB_URI).then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Error connecting to MongoDB:", err))


const app = express()
app.use(express.json())
app.use(cors())

//registration api
app.get("/", (req, res) => {
    res.send("Welcome to the API");
});
app.post("/register", async (req, res) => {
    try {
        const { error } = userSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                message: error.details[0].message
            });
        }
        const { name, email, password } = req.body;
        // Check if the user already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create a new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        const token = jwt.sign({ userId: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: "24h" }); // Token expires in 24 hours
        res.status(201).json({ user: sanitizeUser(newUser), token, message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.get("/register", async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching registrations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/register/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid registration id" });
        }

        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "Registration not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Error fetching registration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.put("/register/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid registration id" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Registration not found" });
        }

        if (req.user.role !== "admin" && req.user._id.toString() !== id) {
            return res.status(403).json({ message: "You are not allowed to update this registration" });
        }

        const { name, email, password } = req.body;

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        res.status(200).json({ user: sanitizeUser(user), message: "Registration updated successfully" });
    } catch (error) {
        console.error("Error updating registration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
app.delete("/register/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid registration id" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Registration not found" });
        }

        if (req.user.role !== "admin" && req.user._id.toString() !== id) {
            return res.status(403).json({ message: "You are not allowed to delete this registration" });
        }

        await Profile.deleteMany({ user: id });
        await User.findByIdAndDelete(id);

        res.status(200).json({ message: "Registration deleted successfully" });
    } catch (error) {
        console.error("Error deleting registration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



//login
app.post("/login", async (req, res) => {
    try {
        const { error } = loginSchemaValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                message: error.details[0].message
            });
        }
        const { name, email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "24h" }); // Token expires in 24 hours
        res.status(200).json({ user: sanitizeUser(user), token, message: "Login successful" });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// get all login users
app.get("/login", authMiddleware, async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching login users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// get one login user by id
app.get("/login/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid user id" });
        }

        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Error fetching login user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.put("/login/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid login id" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Login user not found" });
        }

        if (req.user.role !== "admin" && req.user._id.toString() !== id) {
            return res.status(403).json({ message: "You are not allowed to update this login" });
        }

        const { name, email, password } = req.body;

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        res.status(200).json({ user: sanitizeUser(user), message: "Login updated successfully" });
    } catch (error) {
        console.error("Error updating login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
app.delete("/login/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid login id" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "login not found" });
        }

        if (req.user.role !== "admin" && req.user._id.toString() !== id) {
            return res.status(403).json({ message: "You are not allowed to delete this login" });
        }

        await Profile.deleteMany({ user: id });
        await User.findByIdAndDelete(id);

        res.status(200).json({ message: "login deleted successfully" });
    } catch (error) {
        console.error("Error deleting login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/me", authMiddleware, (req, res) => {
    res.json({ user: req.user })
})

app.post("/profile", authMiddleware, async (req, res) => {
    try {
        const { error, value } = validate(profileValidation, req.body)
        if (error) return res.status(400).json({ message: error })

        const existing = await Profile.findOne({ user: req.user._id })
        if (existing) {
            return res.status(400).json({ message: "Profile already existed for this user" })
        }

        const profile = await Profile.create({ ...value, user: req.user._id })
        return res.status(201).json({ profile, message: "Profile created" })
    } catch (error) {
        console.error("Error creating profile:", error)
        res.status(500).json({ message: "Internal server error" })
    }

})

app.get("/profile/me", authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user._id }).populate(
            "user",
            "name email role"
        )
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" })
        }
        res.json({ profile })
    } catch (error) {
        console.error("Error fetching profile:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.put("/profile/me", authMiddleware, async (req, res) => {
    try {
        const { error, value } = validate(profileValidation, req.body);
        if (error) return res.status(400).json({ message: error });

        const profile = await Profile.findOneAndUpdate(
            { user: req.user._id },
            value,
            { new: true, runValidators: true }
        );
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.json({ profile, message: "Profile updated" });
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
app.delete("/profile/me", authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.findOneAndDelete({ user: req.user._id })
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" })
        }
        res.json({ message: "Profile deleted" })

    } catch (error) {
        console.error("Error deleting Profile:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})
app.get("/profile", authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.find().populate("user", "name email role")
        res.json({ profile })
    } catch (error) {
        console.log("Error listing profiles:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.get("/profile/:id", authMiddleware, async (req, res) => {
    try {
        const profile = await Profile.findById(req.params.id).populate("user", "name email role")
        if (!profile) {
            return res.status(400).json({ message: "Profile not found" })
        }
        res.json({ profile })
    } catch (error) {
        console.error("Error fetching profile:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

//channels

app.post("/channels", authMiddleware, async (req, res) => {
    try {
        const { error, value } = validate(channelValidation, req.body)
        if (error) return res.status(400).json({ message: error })

        const channel = await Channel.create({ ...value, user: req.user._id })
        res.status(201).json({ channel, message: "Channel created" })
    } catch (error) {
        console.error("Error creating channel:", err)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.get("/channels", authMiddleware, async (req, res) => {
    try {
        const channel = await Channel.find().populate("user", "name email role")
        res.json({ channel })
    } catch (error) {
        console.error("Error listing channels:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.get("/channels/:id", authMiddleware, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id).populate(
            "user",
            "name email role"
        )
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" })
        }
        res.json({ channel })
    } catch (error) {
        console.error("Error fetching channel:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.put("/channels/:id", authMiddleware, async (req, res) => {
    try {
        const { error, value } = validate(channelValidation, req.body)
        if (error) return res.status(400).json({ message: error })

        const channel = await Channel.findById(req.params.id)
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" })
        }
        if (String(channel.user) !== String(req.user._id) && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not allowed to update this channel" });
        }
        Object.assign(channel, value);
        await channel.save();
        res.json({ channel, message: "Channel updated" });
    } catch (error) {
        console.error("Error updating channel:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.delete("/channels/:id", authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }
    if (String(channel.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to delete this channel" });
    }
    await channel.deleteOne();
    res.json({ message: "Channel deleted" });
  } catch (error) {
    console.error("Error deleting channel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Articles
app.post("/articles", authMiddleware, async (req, res) => {
  try {
    const { error, value } = validate(articleValidation, req.body);
    if (error) return res.status(400).json({ message: error });

    const channel = await Channel.findById(value.channel);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const article = await Article.create({ ...value, user: req.user._id });
    res.status(201).json({ article, message: "Article created" });
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/articles", async (req, res) => {
  try {
    const filter = {};
    if (req.query.channel) filter.channel = req.query.channel;
    if (req.query.user) filter.user = req.query.user;

    const articles = await Article.find(filter)
      .populate("user", "name email")
      .populate("channel", "name description");
    res.json({ articles });
  } catch (error) {
    console.error("Error listing articles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/articles/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate("user", "name email")
      .populate("channel", "name description");
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json({ article });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/articles/:id", authMiddleware, async (req, res) => {
  try {
    const { error, value } = validate(articleValidation, req.body);
    if (error) return res.status(400).json({ message: error });

    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    if (String(article.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to update this article" });
    }

    const channel = await Channel.findById(value.channel);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    Object.assign(article, value);
    await article.save();
    res.json({ article, message: "Article updated" });
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/articles/:id", authMiddleware, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    if (String(article.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to delete this article" });
    }
    await article.deleteOne();
    res.json({ message: "Article deleted" });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Categories
app.post("/categories", authMiddleware, async (req, res) => {
  try {
    const { error, value } = validate(categoryValidation, req.body);
    if (error) return res.status(400).json({ message: error });

    const category = await Category.create(value);
    res.status(201).json({ category, message: "Category created" });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ categories });
  } catch (error) {
    console.error("Error listing categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/categories/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ category });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/categories/:id", authMiddleware, async (req, res) => {
  try {
    const { error, value } = validate(categoryValidation, req.body);
    if (error) return res.status(400).json({ message: error });

    const category = await Category.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ category, message: "Category updated" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/categories/:id", authMiddleware, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Category ↔ Channel links
app.post("/category-channels", authMiddleware, async (req, res) => {
  try {
    const { error, value } = validate(categoryChannelValidation, req.body);
    if (error) return res.status(400).json({ message: error });

    const [category, channel] = await Promise.all([
      Category.findById(value.category),
      Channel.findById(value.channel),
    ]);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }
    if (String(channel.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to link this channel" });
    }

    const existing = await CategoryChannel.findOne({
      category: value.category,
      channel: value.channel,
    });
    if (existing) {
      return res.status(400).json({ message: "Category already linked to this channel" });
    }

    const link = await CategoryChannel.create({
      ...value,
      user: req.user._id,
    });
    res.status(201).json({ categoryChannel: link, message: "Category linked to channel" });
  } catch (error) {
    console.error("Error linking category to channel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/category-channels", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.channel) filter.channel = req.query.channel;

    const categoryChannels = await CategoryChannel.find(filter)
      .populate("category")
      .populate("channel")
      .populate("user", "name email");
    res.json({ categoryChannels });
  } catch (error) {
    console.error("Error listing category-channel links:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/category-channels/:id", async (req, res) => {
  try {
    const link = await CategoryChannel.findById(req.params.id)
      .populate("category")
      .populate("channel")
      .populate("user", "name email");
    if (!link) {
      return res.status(404).json({ message: "Link not found" });
    }
    res.json({ categoryChannel: link });
  } catch (error) {
    console.error("Error fetching category-channel link:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/category-channels/:id", authMiddleware, async (req, res) => {
  try {
    const link = await CategoryChannel.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ message: "Link not found" });
    }
    if (String(link.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to delete this link" });
    }
    await link.deleteOne();
    res.json({ message: "Link deleted" });
  } catch (error) {
    console.error("Error deleting category-channel link:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.listen(3000, () => {
    console.log("Server is running on port 3000");
});




