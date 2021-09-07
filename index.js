const fs = require('fs')
const path = require('path')
const upload = require('./upload.js')
const core = require('@actions/core')
const inputPath = core.getInput('file-path')
const inputRemoteDir = core.getInput('remote-dir')
const inputUsername = core.getInput('username')
const inputRepo = core.getInput('repo')
const commitMessage = core.getInput('commit-message')
const branchName = core.getInput('branch-name')
core.debug('Input path: ' + inputPath)
core.debug('Input remoteDir: ' + inputRemoteDir)
core.debug('Input username: ' + inputUsername)
core.debug('Input repo: ' + inputRepo)
core.debug('Input commitMessage: ' + commitMessage)
core.debug('Input branchName: ' + branchName)
if (!fs.existsSync(inputPath)) {
  core.setFailed(`filePath doesn't exist: ${inputPath}`)
  return
}
const isInputPathDir = fs.lstatSync(inputPath).isDirectory()
const localDir = isInputPathDir ? inputPath : ''

function getAllFilePaths(curDir) {
  function search(curPath, paths = []) {
    const dir = fs.readdirSync(curPath)
    dir.forEach(item => {
      const itemPath = path.join(curPath, item)
      const stat = fs.lstatSync(itemPath)
      if (stat.isDirectory()) {
        search(itemPath, paths)
      } else {
        paths.push(itemPath)
      }
    })
    return paths
  }
  return search(curDir)
}

const filePaths = isInputPathDir ? getAllFilePaths(inputPath) : [inputPath]
core.debug(`filePaths: ${filePaths}`)

async function uploadAll() {
  for (let index = 0; index < filePaths.length; index++) {
    const curPath = filePaths[index]
    const remotePath = path.join(
      // `remotePath` can not start with `/`
      inputRemoteDir.replace(/^\//, ''),
      path.relative(localDir, curPath)
    )
    console.log(`Upload ${curPath} to ${remotePath}`)
    const base64Content = fs.readFileSync(curPath, {
      encoding: 'base64'
    })
    try {
      let result = await upload(base64Content, {
        Authorization: `Bearer ${core.getInput('access-token')}`,
        username: inputUsername,
        repo: inputRepo,
        commitMessage,
        remotePath,
        branchName
      })

      if (result === null) {
        console.log('Error uploading the file')
        core.setFailed('Error uploading the file')  
      }
    } catch (error) {
      console.log('Unhandled error uploading the file')
      core.setFailed(error)
    }
  }
}

uploadAll()
