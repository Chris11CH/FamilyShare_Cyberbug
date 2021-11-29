const mongoose = require('mongoose')

const objectSchema = new mongoose.Schema(
  {
    object_id: {
      type: String,
      unique: true,
      required: true
    },
    object_name: {
      type: String,
      required: true
    },
    image_id: {
      type: String,
      required: true
    },
    object_description: {
      type: String,
      required: true
    },
    owner: {
      type: String,
      required: true
    },
    group_ids: {
      type: [String],
      default: null,
      required: false
    },
    shared_with_user: {
      type: String,
      default: null,
      required: false
    }
  },
  { timestamps: true, toJSON: { virtuals: true } }
)
mongoose.pluralize(null)
const model = mongoose.model('Object', objectSchema)

module.exports = model
