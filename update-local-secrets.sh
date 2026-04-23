#!/usr/bin/env bash

echo "Storing Atlassian API Key:..."
echo
security add-generic-password -U -a ATLASSIAN_API_TOKEN -s ATLASSIAN_API_TOKEN -w

echo "Done"
echo
echo "Storing Github API Key:..."
echo security add-generic-password -U -a GITHUB_PROJECTS_TOKEN -s GITHUB_PROJECTS_TOKEN -w

./environ.sh
