const countries = require('world-countries')
const fetch = require('node-fetch')
const stringify = require('javascript-stringify')
const propMap = {
  cca2: 'id',
  cca3: 'cca3',
  callingCode: 'callingCodes',
  'name.common': 'title',
}

const prettify = obj => stringify(obj, null, 2)

const getIdToRegionMap = async () => {
  const res = await fetch('https://raw.githubusercontent.com/turnkeylinux/aws-datacenters/master/output/countries.index')
  const csv = await res.text()
  return csv.split('\n').reduce((idToRegion, line) => {
    // e.g.:
    // AL;Albania;eu-central-1
    const [id, name, region] = line.split(';').map(s => s.trim())
    idToRegion[id] = region
    return idToRegion
  }, {})
}

const getPropAtPath = (obj, path) => path.split('.').reduce((val, pathPart) => {
  return val[pathPart]
}, obj)

const gen = async () => {
  const idToRegion = await getIdToRegionMap()
  const data = countries.map(country => {
    const miniCountry = {}
    for (let prop in propMap) {
      let tradleProp = propMap[prop]
      let val = getPropAtPath(country, prop)
      miniCountry[tradleProp] = val
    }

    const { id, title } = miniCountry
    if (idToRegion[id]) {
      miniCountry.awsRegion = idToRegion[id]
    } else {
      console.error(`don't know region for country: ${title} (${id})`)
    }

    return miniCountry
  })
  .reduce((byId, { id, ...country }) => {
    byId[id] = country
    return byId
  }, {})

  console.log(`module.exports = ${prettify(data)}`)
}

gen().catch(err => {
  console.error(err)
  process.exitCode = 1
})
