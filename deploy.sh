name: Deploy

on:
  push:
    branches:
      - main      # Change if you use another branch

jobs:
  deploy:
    runs-on: self-hosted

    steps:
      - name: Deploy
        run: /Users/sandarbh/Projects/github/dashboard/deploy.sh