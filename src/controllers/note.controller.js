const { audit } = require('../config/auditLogger');
const Note = require('../models/Note');

const getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: -1 });

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

    audit('note_created', {
      userId: req.user.id,
      noteId: note._id.toString(),
      title: note.title
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
    audit('note_deleted', {
      userId: req.user.id,
      noteId: note._id.toString(),
      owner: note.owner.toString()
    });

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
