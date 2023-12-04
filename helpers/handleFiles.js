const handleFiles = (fs, directory, filename, data) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(`${directory}`);
    }

    writeToFile(fs, directory, filename, data);
}


const writeToFile = (fs, directory, filename, data) => {
    fs.writeFileSync(`${directory}/${filename}`, data, 'utf8')
}

module.exports = { handleFiles }
