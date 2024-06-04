const handleFiles = (fs, directory, filename, data, async = false) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(`${directory}`);
    }
    if (!async) {
        writeToFile(fs, directory, filename, data);
    }
    else {
        writeToFileAsync(fs, directory, filename, data);
    }
}


const writeToFile = (fs, directory, filename, data) => {
    fs.writeFileSync(`${directory}/${filename}`, data, (error) => {
        if (error) throw Error

        console.log('Data was updated synchronously')
    })
}

const writeToFileAsync = (fs, directory, filename, data) => {
    fs.writeFile(`${directory}/${filename}`, data, (error) => {
        if (error) throw Error

        console.log('Data was updated asynchronously')

    })
}

module.exports = { handleFiles }
