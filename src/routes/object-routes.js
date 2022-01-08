const express = require('express')
const objectid = require('objectid')
const router = new express.Router()

const Object = require('../models/object')
const Image = require('../models/image')

// Wrapper DONE
// Endpoint to register a new object
// Params body:
// object_name
// object_description
router.post('/:user_id', async (req, res, next) => {
  if (req.user_id !== req.params.user_id) { return res.status(401).send('Unauthorized') }
  const object_name = req.body.object_name
  const object_description = req.body.object_description
  if (!(object_name && object_description)) {
    return res.status(400).send('Bad Request')
  }
  try {
    const object_id = objectid()
    const image_id = objectid()
    const newObject = {
      object_id,
      object_name,
      image_id,
      object_description,
      owner: req.params.user_id
    }
    const image = {
      image_id,
      owner_type: 'user',
      owner_id: req.params.user_id,
      path: '/images/profiles/object_default_photo.png',
      thumbnail_path: '/images/profiles/object_default_photo.png'
    }

    await Object.create(newObject)
    await Image.create(image)
    const response = {
      id: object_id,
      name: object_name,
      image: '/images/profiles/object_default_photo.png'
    }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

// Wrapper DONE
// Endpoint to get your objects
// Params body:
// user_id
router.get('/:user_id/objects', (req, res, next) => {
  if (req.user_id !== req.params.user_id) { return res.status(401).send('Unauthorized') }
  Object.find({ owner: req.params.user_id })
    .then(objects => {
      if (!objects || objects.length === 0) {
        return res.status(404).send('No objects for this user')
      }
      res.json(objects)
    }).catch(next)
})

// Wrapper DONE
// Endpoint to get your lent objects
// Params body:
// user_id
router.get('/:user_id/lentObjects', (req, res, next) => {
  if (req.user_id !== req.params.user_id) { return res.status(401).send('Unauthorized') }
  Object.find({ owner: req.params.user_id, shared_with_user: { $ne: null } })
    .then(objects => {
      if (!objects) {
        return res.status(404).send('No objects for this user')
      }
      res.json(objects)
    }).catch(next)
})

// Wrapped DONE
// Endpoint to get your borrowed objects
// Params body:
// user_id
router.get('/:user_id/borrowedObjects', (req, res, next) => {
  if (req.user_id !== req.params.user_id) { return res.status(401).send('Unauthorized') }
  Object.find({ shared_with_user: req.user_id }).then(objects => {
    if (!objects) {
      return res.status(404).send('No objects for this user')
    }
    res.json(objects)
  }).catch(next)
})

// Endpoint to search an object
// Params body:
// user_id
router.get('/:obj_id/search', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ object_id: obj_id })
    .populate('image')
    .lean()
    .exec()
    .then(obj => {
      if (!obj || obj.length === 0) {
        return res.status(404).send('Object not found')
      }
      res.json(obj)
    }).catch(next)
})

// Endpoint to remove an object from the system
// Params body
// user_id
router.get('/:obj_id/remove', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.deleteOne({ object_id: obj_id }).then(obj => {
    if (!obj) {
      return res.status(404).send('Object not found')
    }
    return res.status(200).send('Object Removed')
  }).catch(next)
})

// Endpoint to show shared objects of the group
// Params body:
// user_id
router.get('/:group_id/sharedObjs', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const group_id = req.params.group_id
  Object.find({ group_ids: group_id })
    .then(objects => {
      if (!objects) {
        return res.status(404).send('No shared objects for this group')
      }
      res.json(objects)
    }).catch(next)
})

// Endpoint to show user's shared objects with the group
// Params body:
// user_id
router.get('/:group_id/mySharedObjs', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const group_id = req.params.group_id
  const user = req.user_id
  Object.find({ group_ids: group_id, owner: user })
    .then(objects => {
      if (!objects) {
        return res.status(404).send('Error')
      }
      res.json(objects)
    }).catch(next)
})

// Endpoint to remove an object from a group
// Params body
// user_id
// group_id
router.post('/:obj_id/remove', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  const group_id = req.body.group_id
  Object.findOne({ object_id: obj_id }).then(obj => {
    if (!obj) {
      return res.status(404).send('Object not found')
    }
    if (!obj.group_ids.includes(group_id)) {
      return res.status(404).send('Object not shared in this group')
    }
    obj.group_ids.pull(group_id)
    obj.save()
    return res.status(200).send('Object removed from the group')
  }).catch(next)
})

// Endpoint to share an object with the group
// Params body:
// user_id
// group_id
router.post('/group/:obj_id/shareObj', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  const group_id = req.body.group_id
  Object.findOne({ object_id: obj_id })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      if (obj.group_ids.includes(group_id)) {
        return res.status(502).send('Object already shared with this group')
      }
      obj.group_ids.push(group_id)
      obj.save()
      return res.status(200).send('Object Shared')
    }).catch(next)
})
// Endpoint to remove an object from the group
// Params body:
// user_id
// group_id
router.post('/group/:obj_id/shareObj/remove', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  const group_id = req.body.group_id
  Object.findOne({ object_id: obj_id })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      obj.group_ids.pop(group_id)
      obj.save()
      return res.status(200).send('Object Shared')
    }).catch(next)
})

// Endpoint to send share request
// Params body:
// user_id
router.get('/:obj_id/share', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ object_id: obj_id })
    .then(obj => {
      if (!obj || obj.length === 0) {
        return res.status(404).send('Object not found')
      }
      if (obj.shared_with_user !== null) {
        return res.status(404).send('Object not available')
      }
      obj.req_to_share = req.user_id
      obj.save()
      res.json(obj)
    }).catch(next)
})

// Endpoint to accept share request
// Params body:
// user_id
router.get('/:obj_id/share/accept', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ object_id: obj_id })
    .then(obj => {
      if (!obj || obj.length === 0) {
        return res.status(404).send('Object not found')
      }
      obj.shared_with_user = obj.req_to_share
      obj.req_to_share = null
      obj.save()
      res.json(obj)
    }).catch(next)
})

// Endpoint to ignore share request
// Params body:
// user_id
router.get('/:obj_id/share/ignore', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ object_id: obj_id })
    .then(obj => {
      if (!obj || obj.length === 0) {
        return res.status(404).send('Object not found')
      }
      obj.req_to_share = null
      obj.save()
      res.json(obj)
    }).catch(next)
})

// Endpoint to get incoming share requests
// Params body:
// user_id
router.get('/:user_id/getInShareRequests', (req, res, next) => {
  if (req.user_id !== req.params.user_id) { return res.status(401).send('Unauthorized') }
  Object.find({ owner: req.user_id, req_to_share: { $ne: null } })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      res.json(obj)
    }).catch(next)
})

// Endpoint to get outcoming share requests
// Params body:
// user_id
router.get('/:user_id/getOutShareRequests', (req, res, next) => {
  if (req.user_id !== req.params.user_id) { return res.status(401).send('Unauthorized') }
  Object.find({ req_to_share: req.user_id })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      res.json(obj)
    }).catch(next)
})

// Endpoint to notify object return
// Params body:
// user_id
router.get('/:obj_id/share/return', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ object_id: obj_id })
    .then(obj => {
      if (!obj || obj.length === 0) {
        return res.status(404).send('Object not found')
      }
      if (!obj.shared_with_user) {
        return res.status(404).send('Object is not shared')
      }
      obj.shared_with_user = null
      obj.save()
      res.json(obj)
    }).catch(next)
})

module.exports = router
