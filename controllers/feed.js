const { validationResult } = require('express-validator');

const errorHandler = require('../util/errorHandler');
const clearImage = require('../util/clearImage');
const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2; // number of posts on page
  let totalItems;
  try {
    const count = await Post
      .find()
      .populate('creator')
      .countDocuments();
    totalItems = +count;
    const posts = await Post
      .find()
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    if (!posts) {
      const error = new Error('Could not find posts');
      error.statusCode = 404;
      throw error;
    };
    res.status(200).json({ 
      message: "Posts fetched succesfully",
      posts: posts,
      totalItems: totalItems
    });
  } catch (err) {
    errorHandler(err, next);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error('No image provided');
    error.statusCode = 422;
    throw error;
  }
  // меняем \ на / в пути к изображению
  const imageUrl = req.file.path.replace(/[\\]/g, '/');
  const title = req.body.title;
  const content = req.body.content;
  const post = new Post({
    title: title,
    imageUrl: imageUrl,
    content: content,
    creator: req.userId 
  });
  try {
    await post.save();
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();
    io.getIO().emit('posts', {
      action: 'create',
      post: { 
        ...post.toJSON(), // instead of post._doc
        creator: {
          _id: user._id,
          name: user.name
        }
      }
    })
    res.status(201).json({
      message: "Post created successfully!",
      post: post,
      creator: {
        _id: user._id,
        name: user.name
      }
    })
  } catch (err) {
    errorHandler(err, next);
  }
}

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        message: "Post fetched succesfully",
        post: post
      });
    })
    .catch(err => errorHandler(err, next))
}

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace(/[\\]/g, '/');
  }
  if (!imageUrl) {
    const error = new Error("No file picked");
    error.statusCode = 422;
    throw error;
  }
  try {
    const post = await Post.findById(postId).populate('creator');
    if (!post) {
      const error = new Error('Could not find post');
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized');
      error.statusCode = 403; //forbidden request
      throw error;
    }
    // удаление старого изображения
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();
    io.getIO().emit('posts', {
      action: 'update',
      post: result
    });
    res.status(200).json({
      message: "Post updated successfully.",
      post: result
    })
  } catch(err) {
    errorHandler(err, next);
  }
}

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post');
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized');
      error.statusCode = 403; //forbidden request
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndDelete(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    io.getIO().emit('posts', { action: 'delete', post: postId });
    res.status(200).json({
      message: "Post successfully deleted."
    });
  } catch (err) {
    errorHandler(err, next)
  }
}
