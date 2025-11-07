# Overview

For smaller-scale migrations involving thousands or tens of thousands of assets, running the script from your local machine should suffice. 

For larger migrations with hundreds of thousands of assets, it's advisable to run the script from a stable, always-on environment with reliable internet connectivity (for example, an AWS EC2 VM).

# Guidelines for Provisioning a Virtual Machine Runtime

## Important Considerations ❗️

- If you're planning to run the script on a VM via an SSH connection, make sure to use a terminal multiplexer like `screen` or `tmux`.
    - Not using a multiplexer will likely result in the migration process stalled or even terminated.

## CPU and Memory ⚙️

- The script is not resource-intensive as most of the heavy lifting is done by Cloudinary's back-end systems.
    - For example, an AWS `t2.micro` EC2 VM is usually sufficient

## Storage Requirements 💾

- A general rule of thumb for estimating migration log file size is approximately 300MB per 100,000 assets migrated. This can increase if you're transferring extensive taxonomy data.
    - Each log file record contains the following data for troubleshooting:
        + All fields from the corresponding input CSV file record.
        + The Cloudinary API payload it was converted to.
        + The API response.
        + Execution trace produced by [plugins](./plugins.md) (if any used)

# Deploying the Script into the Runtime

## Fork or Import the Repository 🍴

- It's advisable to start by forking or importing this repository so you can maintain any customizations and keep a history of changes.

## Clone the Repository 👯

- Clone the forked (imported) repository onto your system.

## Install Node.js 🛠️

- Node.js can be easily installed using the [Node Version Management shell script](https://github.com/nvm-sh/nvm).

## Install Script Dependencies 📚

- Open a terminal shell and navigate to the folder where you've cloned the repository. You should see a `package.json` file in that folder.
    - Run `npm install --production` to fetch and install required packages for the migration script (omitting dev dependencies).