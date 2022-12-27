"use strict";

// Dependencies
const dnsResolver = require("dns-resolver")
const puppeteer = require("puppeteer")
const chalk = require("chalk")
const delay = require("delay")
const fs = require("fs")

// Variables
const args = process.argv.slice(2)

var subenujs = {
    results: "",
    subdomains: null
}

// Functions
async function getSubdomains(){
    console.log(`[${chalk.blueBright("INFO")}] Scanning ${args[0]} subdomains.`)
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] })
    const page = await browser.newPage()

    await page.goto("https://subdomainfinder.c99.nl/", { waitUntil: "domcontentloaded" })
    await page.type("#domain", args[0])
    await page.click("#privatequery")
    await page.click("#scan_subdomains")
    await page.waitForSelector("body > div > div.col-md-12 > div:nth-of-type(1) > center > div.row > div > a", { timeout: 0 })
    const subdomains = await page.$$eval("#result_table > tbody > tr > td:nth-of-type(2) > a", elems =>{
        return elems.map(elem => elem.textContent)
    })

    subenujs.subdomains = subdomains
    
    console.log(`[${chalk.blueBright("INFO")}] Subdomains scanning finished..`)
    browser.close()
    enumerate()
}

function enumerate(){
    console.log(`[${chalk.blueBright("INFO")}] Scanning ${args[0]} subdomains DNS.`)

    var subdomainIndex = 0

    async function enumerateSubdomains(){
        await delay(100)

        if(subdomainIndex > subenujs.subdomains.length){
            console.log(`[${chalk.blueBright("INFO")}] Scanning ${args[0]} subdomains DNS finished.`)
            return end()
        }

        if(!subenujs.subdomains[subdomainIndex].length){
            subdomainIndex += 1
            return enumerateSubdomains()
        }

        try{
            dnsResolver.configure(subenujs.subdomains[subdomainIndex], function(err, data){
                if(err){
                    subdomainIndex += 1
                    return enumerateSubdomains()
                }

                dnsResolver.resolve(subenujs.subdomains[subdomainIndex], function(err, data){
                    if(err){
                        subdomainIndex += 1
                        return enumerateSubdomains()
                    }

                    if(subenujs.results.length === 0){
                        subenujs.results = `${subenujs.subdomains[subdomainIndex]} - ${data}`
                    }else{
                        subenujs.results += `\n${subenujs.subdomains[subdomainIndex]} - ${data}`
                    }
    
                    subdomainIndex += 1
                    enumerateSubdomains()
                })
            })
        }catch{
            subdomainIndex += 1
            enumerateSubdomains()
        }
    }

    function end(){
        fs.writeFile(args[1], subenujs.results, "utf8", function(err){
            if(err){
                console.log(`[${chalk.redBright("[ERROR]")}] ${err.toString()}`)
                console.log(`[${chalk.yellowBright("[WARNING]")}] Aborting...`)
                process.exit()
            }

            console.log(`[${chalk.blueBright("INFO")}] Done.`)
            process.exit()
        })
    }

    enumerateSubdomains()
}

// Main
if(!args.length) return console.log("usage: node index.js <domain> <outputFile>")

getSubdomains()