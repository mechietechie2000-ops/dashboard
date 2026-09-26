import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Modal,
  Select,
  Snackbar,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';

import { tokens } from '../../theme';
import Header from '../../components/Header';

const Meal = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);

  const [mealDate, setMealDate] = useState('');
  const [mealDay, setMealDay] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [bread, setBread] = useState('');
  const [notificationType, setNotificationType] = useState('none');

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');

  const [message, setMessage] = useState('');

  // ------------------------------------------------------------
  // Load meals
  // ------------------------------------------------------------

  const loadMeals = useCallback(async () => {
    try {
      const response = await fetch('/meal');

      if (!response.ok) {
        throw new Error('Failed to load meals');
      }

      const data = await response.json();
      setMeals(data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load meals');
    }
  }, []);

  // ------------------------------------------------------------
  // Load recipes
  // ------------------------------------------------------------

  const loadRecipes = useCallback(async () => {
    try {
      const response = await fetch('/recipe');

      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }

      const data = await response.json();
      setRecipes(data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load recipes');
    }
  }, []);

  useEffect(() => {
    loadMeals();
    loadRecipes();
  }, [loadMeals, loadRecipes]);

  // ------------------------------------------------------------
  // Open Add
  // ------------------------------------------------------------

  const openAdd = () => {
    setEditingMeal(null);
    setMealDate('');
    setMealDay('');
    setSelectedRecipes([]);
    setBread('');
    setNotificationType('none');
    setModalOpen(true);
  };

  // ------------------------------------------------------------
  // Open Edit
  // ------------------------------------------------------------

  const openEdit = (meal) => {
    setEditingMeal(meal);
    setMealDate(meal.meal_date || '');
    setMealDay(meal.meal_day || '');
    setSelectedRecipes(meal.recipes?.map((recipe) => recipe.id) || []);
    setBread(meal.bread || '');
    setNotificationType(meal.notification_type || 'none');
    setModalOpen(true);
  };

  // ------------------------------------------------------------
  // Close modal
  // ------------------------------------------------------------

  const closeModal = () => {
    setModalOpen(false);
    setEditingMeal(null);
  };

  // ------------------------------------------------------------
  // Recipe selection
  // ------------------------------------------------------------

  const toggleRecipe = (recipeId) => {
    setSelectedRecipes((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  // ------------------------------------------------------------
  // Save meal
  // ------------------------------------------------------------

  const saveMeal = async () => {
    if (!mealDay) {
      setMessage('Please select a day');
      return;
    }

    if (selectedRecipes.length === 0) {
      setMessage('Please select at least one recipe');
      return;
    }

    const payload = {
      meal_date: mealDate,
      day_of_week: mealDay,
      recipe_ids: selectedRecipes,
      bread: bread || null,
      notification_type: notificationType,
    };

    try {
      const url = editingMeal ? `/meal/${editingMeal.id}` : '/meal';

      const response = await fetch(url, {
        method: editingMeal ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save meal');
      }

      await loadMeals();
      closeModal();

      setMessage(editingMeal ? 'Meal updated' : 'Meal added');
    } catch (err) {
      console.error(err);
      setMessage('Failed to save meal');
    }
  };

  // ------------------------------------------------------------
  // Delete meal
  // ------------------------------------------------------------

  const deleteMeal = async (mealId) => {
    try {
      const response = await fetch(`/meal/${mealId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }

      await loadMeals();
      setMessage('Meal deleted');
    } catch (err) {
      console.error(err);
      setMessage('Failed to delete meal');
    }
  };

  // ------------------------------------------------------------
  // Add recipe
  // ------------------------------------------------------------

  const addRecipe = async () => {
    const name = newRecipeName.trim();

    if (!name) {
      return;
    }

    try {
      const response = await fetch('/recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add recipe');
      }

      const newRecipe = await response.json();

      await loadRecipes();

      // Automatically select newly-created recipe
      setSelectedRecipes((prev) => [...prev, newRecipe.id]);

      setNewRecipeName('');
      setRecipeModalOpen(false);
      setMessage('Recipe added');
    } catch (err) {
      console.error(err);
      setMessage('Failed to add recipe');
    }
  };

  // ------------------------------------------------------------
  // Format date
  // ------------------------------------------------------------

  const formatDate = (date) => {
    if (!date) return '';

    const value = new Date(`${date}T00:00:00`);

    return value.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <Box m={{ xs: '0px', sm: '20px' }}>
      <Header title="MEALS" subtitle="Plan your meals" />

      {/* Meal Cards */}

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        }}
        gap="20px"
        mt="10px"
      >
        {meals.map((meal) => (
          <Card
            key={meal.id}
            sx={{
              backgroundColor: colors.primary[400],
              borderRadius: '8px',
              boxShadow: 1,
            }}
          >
            <CardContent sx={{ position: 'relative' }}>
              {/* Actions */}

              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: '2px',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => openEdit(meal)}
                  aria-label="Edit meal"
                >
                  <EditOutlinedIcon
                    sx={{ color: colors.blueAccent[400] }}
                  />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => deleteMeal(meal.id)}
                  aria-label="Delete meal"
                >
                  <DeleteOutlineIcon
                    sx={{ color: colors.redAccent[400] }}
                  />
                </IconButton>
              </Box>

              {/* Date */}

              <Box display="flex" alignItems="center" gap="8px" mb="12px">
                <RestaurantMenuOutlinedIcon
                  sx={{ color: colors.greenAccent[500] }}
                />

                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={colors.grey[100]}
                  sx={{ pr: 7 }}
                >
                  {formatDate(meal.meal_date)}
                </Typography>
              </Box>

              {/* Recipes */}

              <Box mb="12px">
                {meal.recipes?.map((recipe) => (
                  <Typography
                    key={recipe.id}
                    color={colors.grey[200]}
                    sx={{ mb: '4px' }}
                  >
                    • {recipe.recipe_name}
                  </Typography>
                ))}
              </Box>

              {/* Bread */}

              {meal.bread && (
                <Typography
                  color={colors.grey[300]}
                  variant="body2"
                  mb="6px"
                >
                  🍞 {meal.bread}
                </Typography>
              )}

              {/* Notification */}

              {meal.notification_type &&
                meal.notification_type !== 'none' && (
                  <Typography
                    color={colors.grey[300]}
                    variant="body2"
                  >
                    🔔 {meal.notification_type}
                  </Typography>
                )}
            </CardContent>
          </Card>
        ))}

        {/* Add Meal Card */}

        <Card
          onClick={openAdd}
          sx={{
            backgroundColor: colors.primary[400],
            borderRadius: '8px',
            boxShadow: 1,
            cursor: 'pointer',
            minHeight: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: colors.primary[300],
            },
          }}
        >
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap="8px"
          >
            <AddCircleOutlineIcon
              sx={{
                fontSize: 42,
                color: colors.greenAccent[500],
              }}
            />

            <Typography color={colors.grey[200]}>
              Add Meal
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Add / Edit Meal Modal */}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: colors.primary[400],
            borderRadius: '16px',
            p: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            outline: 'none',
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
            mb="20px"
            color={colors.grey[100]}
          >
            {editingMeal ? 'Edit Meal' : 'Add Meal'}
          </Typography>

          {/* Date */}

          <Typography color={colors.grey[200]} mb="6px">
            Date
          </Typography>

          <TextField
            type="date"
            fullWidth
            size="small"
            value={mealDate}
            onChange={(e) => setMealDate(e.target.value)}
            sx={{
              mb: '18px',
              '& input': {
                color: colors.grey[100],
              },
            }}
          />

          {/* Day */}

          <Typography color={colors.grey[200]} mb="6px">
            Day
          </Typography>

          <TextField
            type="input"
            fullWidth
            size="small"
            value={mealDay}
            onChange={(e) => setMealDay(e.target.value)}
            sx={{
              mb: '18px',
              '& input': {
                color: colors.grey[100],
              },
            }}
          />
          {/* Recipes */}

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb="6px"
          >
            <Typography color={colors.grey[200]}>
              Recipes
            </Typography>

            <Button
              size="small"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setRecipeModalOpen(true)}
            >
              Add Recipe
            </Button>
          </Box>

          <Box
            sx={{
              border: `1px solid ${colors.grey[600]}`,
              borderRadius: '8px',
              p: '8px',
              mb: '18px',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {recipes.length === 0 ? (
              <Typography
                variant="body2"
                color={colors.grey[400]}
                p="8px"
              >
                No recipes available.
              </Typography>
            ) : (
              recipes.map((recipe) => (
                <FormControlLabel
                  key={recipe.id}
                  control={
/*                     <Checkbox
                      checked={selectedRecipes.includes(recipe.id)}
                      onChange={() => toggleRecipe(recipe.id)}
                    /> */
                    <Select
                    multiple
                    fullWidth
                    size="small"
                    value={selectedRecipes}
                    onChange={(e) => setSelectedRecipes(e.target.value)}
                    renderValue={(selected) =>
                        selected
                        .map((id) => recipes.find((r) => r.id === id)?.recipe_name)
                        .join(', ')
                    }
                    >
                    {recipes.map((recipe) => (
                        <MenuItem key={recipe.id} value={recipe.id}>
                        {recipe.recipe_name}
                        </MenuItem>
                    ))}
                    </Select>                    
                  }
                  //label={recipe.recipe_name}
                  sx={{
                    display: 'flex',
                    color: colors.grey[200],
                  }}
                />
              ))
            )}
          </Box>

          {/* Bread */}

          <Typography color={colors.grey[200]} mb="6px">
            Bread
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: '18px' }}>
            <Select
              value={bread}
              displayEmpty
              onChange={(e) => setBread(e.target.value)}
              sx={{
                color: colors.grey[100],
              }}
            >
              <MenuItem value="">
                None
              </MenuItem>

              <MenuItem value="Rice">Rice</MenuItem>
              <MenuItem value="Roti">Roti</MenuItem>
              <MenuItem value="Naan">Naan</MenuItem>
              <MenuItem value="Garlic Naan">Garlic Naan</MenuItem>
            </Select>
          </FormControl>

          {/* Notification */}

          <Typography color={colors.grey[200]} mb="6px">
            Notification
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: '24px' }}>
            <Select
              value={notificationType}
              onChange={(e) =>
                setNotificationType(e.target.value)
              }
              sx={{
                color: colors.grey[100],
              }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="voice">Voice</MenuItem>
              <MenuItem value="text">Text</MenuItem>
            </Select>
          </FormControl>

          {/* Buttons */}

          <Box display="flex" gap="10px">
            <Button
              fullWidth
              variant="outlined"
              onClick={closeModal}
            >
              Cancel
            </Button>

            <Button
              fullWidth
              variant="contained"
              onClick={saveMeal}
              sx={{
                backgroundColor: colors.blueAccent[600],
                '&:hover': {
                  backgroundColor: colors.blueAccent[700],
                },
              }}
            >
              {editingMeal ? 'Update' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Add Recipe Modal */}

      <Modal
        open={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
            bgcolor: colors.primary[400],
            borderRadius: '16px',
            p: '24px',
            outline: 'none',
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            mb="18px"
            color={colors.grey[100]}
          >
            Add Recipe
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Recipe name"
            value={newRecipeName}
            onChange={(e) => setNewRecipeName(e.target.value)}
            autoFocus
            sx={{
              mb: '20px',
            }}
          />

          <Box display="flex" gap="10px">
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setRecipeModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              fullWidth
              variant="contained"
              onClick={addRecipe}
              sx={{
                backgroundColor: colors.greenAccent[600],
                '&:hover': {
                  backgroundColor: colors.greenAccent[700],
                },
              }}
            >
              Add
            </Button>
          </Box>
        </Box>
      </Modal>

      <Snackbar
        open={!!message}
        message={message}
        autoHideDuration={3000}
        onClose={() => setMessage('')}
      />
    </Box>
  );
};

export default Meal;