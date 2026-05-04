const Note = require('../models/Note');

const getNotes = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { owner: req.user.id };
    const notes = await Note.find(query).sort({ createdAt: -1 });

    return res.status(200).json({ notes });
  } catch (error) {
    return next(error);
  }
};

const createNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const note = await Note.create({
      title,
      content,
      owner: req.user.id
    });

    return res.status(201).json({
      message: 'Note created successfully',
      note
    });
  } catch (error) {
    return next(error);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    await note.deleteOne();
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createNote,
  deleteNote,
  getNotes
};
