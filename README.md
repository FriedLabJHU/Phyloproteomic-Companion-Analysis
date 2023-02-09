# Phyloproteomic-Companion-Analysis

Companion files used in the collection, creation, and analysis of data.

## Prerequisites

1. You will need an input file to use
2. nodejs
3. yarn or npm

## Getting Started

`$ git clone https://github.com/FriedLabJHU/Phyloproteomic-Companion-Analysis.git`

Add your source file to the repository root

`yarn install; inputFile=file.tsv yarn start;` OR `npm install; inputFile=file.tsv npm start`

## Environment Variables

<table>
    <tr>
        <th>Variable</th>
        <th>Default</th>
        <th>Description</th>
        <th>Required</th>
    </tr>
    <tr>
        <td>inputFile</td>
        <td></td>
        <td>Input file name to use</td>
        <td>true</td>
    </tr>
    <tr>
        <td>outputFile</td>
        <td>output.tsv</td>
        <td>Output file name to use</td>
        <td></td>
    </tr>
    <tr>
        <td>browsers</td>
        <td>10</td>
        <td>Number of browser tabs to use</td>
        <td></td>
    </tr>
</table>
