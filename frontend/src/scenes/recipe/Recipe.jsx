import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Modal,
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

const Recipe = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [recipes, setRecipes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [message, setMessage] = useState('');

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
    loadRecipes();
  }, [loadRecipes]);

  // ------------------------------------------------------------
  // Add
  // ------------------------------------------------------------

  const openAdd = () => {
    setEditingRecipe(null);
    setRecipeName('');
    setModalOpen(true);
  };

  // ------------------------------------------------------------
  // Edit
  // ------------------------------------------------------------

  const openEdit = (recipe) => {
    setEditingRecipe(recipe);
    setRecipeName(recipe.recipe_name || '');
    setModalOpen(true);
  };

  // ------------------------------------------------------------
  // Close
  // ------------------------------------------------------------

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecipe(null);
    setRecipeName('');
  };

  // ------------------------------------------------------------
  // Save
  // ------------------------------------------------------------

  const saveRecipe = async () => {
    const name = recipeName.trim();

    if (!name) {
      setMessage('Please enter a recipe name');
      return;
    }

    try {
      const url = editingRecipe
        ? `/recipe/${editingRecipe.id}`
        : '/recipe';

      const response = await fetch(url, {
        method: editingRecipe ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save recipe');
      }

      await loadRecipes();
      closeModal();

      setMessage(editingRecipe ? 'Recipe updated' : 'Recipe added');
    } catch (err) {
      console.error(err);
      setMessage('Failed to save recipe');
    }
  };

  // ------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------

  const deleteRecipe = async (recipeId) => {
    try {
      const response = await fetch(`/recipe/${recipeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      await loadRecipes();
      setMessage('Recipe deleted');
    } catch (err) {
      console.error(err);
      setMessage('Failed to delete recipe');
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <Box m={{ xs: '0px', sm: '20px' }}>
      <Header title="RECIPES" subtitle="Manage your recipes" />

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
        {recipes.map((recipe) => (
          <Card
            key={recipe.id}
            sx={{
              backgroundColor: colors.primary[400],
              borderRadius: '8px',
              boxShadow: 1,
            }}
          >
            <CardContent
              sx={{
                position: 'relative',
                minHeight: 100,
              }}
            >
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
                  onClick={() => openEdit(recipe)}
                  aria-label="Edit recipe"
                >
                  <EditOutlinedIcon
                    sx={{ color: colors.blueAccent[400] }}
                  />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => deleteRecipe(recipe.id)}
                  aria-label="Delete recipe"
                >
                  <DeleteOutlineIcon
                    sx={{ color: colors.redAccent[400] }}
                  />
                </IconButton>
              </Box>

              {/* Recipe */}

              <Box
                display="flex"
                alignItems="center"
                gap="10px"
                sx={{ pr: 8 }}
              >
                <RestaurantMenuOutlinedIcon
                  sx={{
                    color: colors.greenAccent[500],
                  }}
                />

                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={colors.grey[100]}
                >
                  {recipe.recipe_name}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}

        {/* Add Recipe Card */}

        <Card
          onClick={openAdd}
          sx={{
            backgroundColor: colors.primary[400],
            borderRadius: '8px',
            boxShadow: 1,
            cursor: 'pointer',
            minHeight: 100,
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
            alignItems="center"
            gap="8px"
          >
            <AddCircleOutlineIcon
              sx={{
                fontSize: 36,
                color: colors.greenAccent[500],
              }}
            />

            <Typography color={colors.grey[200]}>
              Add Recipe
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Add / Edit Modal */}

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
            outline: 'none',
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
            mb="20px"
            color={colors.grey[100]}
          >
            {editingRecipe ? 'Edit Recipe' : 'Add Recipe'}
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Recipe name"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            autoFocus
            sx={{ mb: '24px' }}
          />

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
              onClick={saveRecipe}
              sx={{
                backgroundColor: colors.blueAccent[600],
                '&:hover': {
                  backgroundColor: colors.blueAccent[700],
                },
              }}
            >
              {editingRecipe ? 'Update' : 'Save'}
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

export default Recipe;