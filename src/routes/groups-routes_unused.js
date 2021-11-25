
/*
router.get('/suggestions', (req, res, next) => {
  Group_Settings.find({ visible: true })
    .then(groups => {
      if (groups.length === 0) {
        return res.status(404).send('No suggestions were found')
      }
      const noOfSuggestions = groups.length > 2 ? 3 : groups.length
      const suggestions = []
      for (let i = groups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = groups[i]
        groups[i] = groups[j]
        groups[j] = temp
      }
      for (let i = 0; i < noOfSuggestions; i++) {
        suggestions.push(groups[i].group_id)
      }
      res.json(suggestions)
    })
    .catch(next)
})
*/
