const express = require("express");
const router = express.Router();
const db = require("../db/connection");

router.get("/meal", async (req, res) => {
  try {
    res.json(await db.all("SELECT * FROM meal"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all meals
/* router.get("/meal", async (req, res) => {
  try {
    const meals = await db.all(`
      SELECT
        m.id,
        m.meal_date,
        m.bread,
        m.notification_type,
        m.notification_sent,
        m.created_at,
        r.id AS recipe_id,
        r.recipe_name
      FROM meal m
      LEFT JOIN meal_recipe mr ON m.id = mr.meal_id
      LEFT JOIN recipe r ON mr.recipe_id = r.id
      ORDER BY m.meal_date
    `);

    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

 */

router.get("/meal", async (req, res) => {
  try {
    const meals = await db.all(`
      SELECT
        m.id,
        m.meal_date,
        m.day_of_week,
        m.bread,
        m.notification_type,
        m.notification_sent,
        m.created_at,
        mr.recipe_id,
        r.recipe_name
      FROM meal m
      LEFT JOIN meal_recipe mr ON m.id = mr.meal_id
      LEFT JOIN recipe r ON mr.recipe_id = r.id
      ORDER BY m.meal_date
    `);

    // const meals = [];

    for (const row of meals) {
      let meal = result.find(m => m.id === row.id);

      if (!meal) {
        meal = {
          id: row.id,
          meal_date: row.meal_date,
          day_of_week: row.day_of_week,
          bread: row.bread,
          notification_type: row.notification_type,
          notification_sent: row.notification_sent,
          created_at: row.created_at,
          recipes: []
        };

        meals.push(meal);
      }

      if (row.recipe_id) {
        meal.recipes.push({
          id: row.recipe_id,
          recipe_name: row.recipe_name
        });
      }
    }

    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INSERT meal
router.post("/meal", async (req, res) => {
  const {
    meal_date,
    day_of_week,
    bread,
    notification_type,
    recipe_ids
  } = req.body;

  try {
    await db.run("BEGIN TRANSACTION");

    const result = await db.run(
      `INSERT INTO meal
       (meal_date, day_of_week, bread, notification_type)
       VALUES (?, ?, ?, ?)`,
      [meal_date, day_of_week, bread, notification_type]
    );

    const mealId = result.lastID;

    for (const recipeId of recipe_ids || []) {
      await db.run(
        `INSERT INTO meal_recipe (meal_id, recipe_id)
         VALUES (?, ?)`,
        [mealId, recipeId]
      );
    }

    await db.run("COMMIT");

    res.status(201).json({ id: mealId });
  } catch (err) {
    await db.run("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});


// UPDATE meal
router.put("/meal/:id", async (req, res) => {
  const { id } = req.params;
  const {
    meal_date,
    bread,
    notification_type,
    recipe_ids
  } = req.body;

  try {
    await db.run("BEGIN TRANSACTION");

    await db.run(
      `UPDATE meal
       SET meal_date = ?,
           bread = ?,
           notification_type = ?
       WHERE id = ?`,
      [meal_date, bread, notification_type, id]
    );

    // Replace recipe selections
    await db.run(
      `DELETE FROM meal_recipe WHERE meal_id = ?`,
      [id]
    );

    for (const recipeId of recipe_ids || []) {
      await db.run(
        `INSERT INTO meal_recipe (meal_id, recipe_id)
         VALUES (?, ?)`,
        [id, recipeId]
      );
    }

    await db.run("COMMIT");

    res.json({ message: "Meal updated successfully" });
  } catch (err) {
    await db.run("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});


// DELETE meal
router.delete("/meal/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.run("BEGIN TRANSACTION");

    await db.run(
      `DELETE FROM meal_recipe WHERE meal_id = ?`,
      [id]
    );

    await db.run(
      `DELETE FROM meal WHERE id = ?`,
      [id]
    );

    await db.run("COMMIT");

    res.json({ message: "Meal deleted successfully" });
  } catch (err) {
    await db.run("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
