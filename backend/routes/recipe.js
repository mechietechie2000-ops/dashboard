const express = require("express");
const router = express.Router();
const db = require("../db/connection");
// GET all recipes
router.get("/recipe", async (req, res) => {
  try {
    res.json(await db.all(`
      SELECT id, recipe_name
      FROM recipe
      ORDER BY recipe_name
    `));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET recipe by ID
router.get("/recipe/:id", async (req, res) => {
  try {
    const recipe = await db.get(
      `SELECT id, recipe_name
       FROM recipe
       WHERE id = ?`,
      [req.params.id]
    );

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// INSERT recipe
router.post("/recipe", async (req, res) => {
  try {
    const result = await db.run(
      `INSERT INTO recipe (recipe_name)
       VALUES (?)`,
      [req.body.recipe_name]
    );

    res.status(201).json({
      id: result.lastID,
      recipe_name: req.body.recipe_name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// UPDATE recipe
router.put("/recipe/:id", async (req, res) => {
  try {
    const result = await db.run(
      `UPDATE recipe
       SET recipe_name = ?
       WHERE id = ?`,
      [req.body.recipe_name, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json({ message: "Recipe updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE recipe
router.delete("/recipe/:id", async (req, res) => {
  try {
    const result = await db.run(
      `DELETE FROM recipe
       WHERE id = ?`,
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    res.json({ message: "Recipe deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
