import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import abi from "./abi.json";
import axios from 'axios';
import ReactHTMLTableToExcel from 'react-html-table-to-excel';
import "./App.css"
const CONTRACT_ADDRESS = "0xC0B7b9cF081c8c37fe52402D15322D4C7d0Bb1F6";

let PROVIDER, CURRENT_ACCOUNT, NFT_CONTRACT, BATCH_PROVIDER, TOTAL_SUPPLY;

let OWNERS = [], URIs = [], RESPONSES = [], RESULTS = [];
let owners1 = [], tokenId = [];
function App() {
  const [result, setResult] = useState([])
  const [Supply, setSupply] = useState()
  useEffect(() => {

    connectToMetamask();

  }, [])

  const connectToMetamask = async () => {
    if (window.ethereum) {
      PROVIDER = new ethers.providers.Web3Provider(window.ethereum, "any");
      BATCH_PROVIDER = new ethers.providers.JsonRpcBatchProvider("https://api.avax.network/ext/bc/C/rpc");
      // Prompt user for account connections
      await PROVIDER.send("eth_requestAccounts", []);
      CURRENT_ACCOUNT = PROVIDER.getSigner();
      NFT_CONTRACT = new ethers.Contract(CONTRACT_ADDRESS, abi, BATCH_PROVIDER);
      await getTotalSupply();
      if (TOTAL_SUPPLY > 480) {
        let startIndex = 0;
        let endIndex = 480;
        for (let index = 0; index < TOTAL_SUPPLY; index++) {

          OWNERS = [...OWNERS, ...await getData("Holders", startIndex, endIndex)];
          URIs = [...URIs, ...await getData("URIs", startIndex, endIndex)];

          console.log("OWNERS Array Length::", OWNERS.length);
          console.log("URIs Array Length::", URIs.length);

          if (endIndex == TOTAL_SUPPLY) {
            break;
          }

          startIndex = endIndex;
          endIndex += 480;
          if (endIndex > TOTAL_SUPPLY) {
            let difference = TOTAL_SUPPLY - (endIndex - 480);
            endIndex = startIndex + difference;
          }

        }
      } else {
        OWNERS = [...OWNERS, ...await getData("Holders", 0, TOTAL_SUPPLY)];
        URIs = [...URIs, ...await getData("URIs", 0, TOTAL_SUPPLY)];
      }

      console.log(RESPONSES.length)
      await filterMetaData()
    } else {
      console.log("Metamask Not Installed");
    }
  }

  const getTotalSupply = async () => {

    TOTAL_SUPPLY = parseInt(await NFT_CONTRACT.totalSupply());
    setSupply(TOTAL_SUPPLY)
    console.log("Total Supply ::", TOTAL_SUPPLY);
  }

  const getData = async (type, startIndex, supply) => {

    let promises = []
    let endIndex = startIndex + 40;
    let fetching = true;
    let responseArray = [];
    while (fetching) {
      for (let index = startIndex; index < endIndex; index++) {
        try {
          if (type === "Holders") {
            promises.push(NFT_CONTRACT.ownerOf(index));
          } else {
            promises.push(NFT_CONTRACT.tokenURI(index));
          }
        } catch (error) {
          console.log(error)
        }
        if (endIndex === supply) {
          fetching = false;
        }

      }
      try {
        if (type === "Holders") {
          responseArray = await Promise.all(promises);
          console.log("Owners", responseArray.length)
        } else {
          responseArray = await Promise.all(promises);
          console.log("URIs", responseArray.length);
          console.log(responseArray, "========")
          await getMetaData(startIndex, endIndex, responseArray)
          console.log("Responses length", RESPONSES.length);
        }
      } catch (error) {
        console.log(error)
      }
      startIndex = endIndex;
      endIndex += 40;
      if (endIndex > supply) {
        let difference = supply - (endIndex - 40);
        endIndex = startIndex + difference;
      }
    }
    return responseArray;
  }

  const getMetaData = async (startIndex, endIndex, URI) => {
    startIndex = startIndex % 480;
    if (endIndex % 480 === 0) {
      endIndex = 480
    } else {
      endIndex = endIndex % 480;
    }
    console.log("Start", startIndex, "End", endIndex);
    await Promise.allSettled(URI.slice(startIndex, endIndex).map(async (match, ind) => {
      try {
        let index = match.split("/");
        let findIndex = index[5].split(".")[0]
        const response = await axios.request({
          url: match,
          method: 'get',
          headers: {
            accept: 'application/json',
          },
        });
        if (response.data?.attributes !== undefined) {
          let response1 = response.data?.attributes.map((val) => {
            return val.trait_type.includes("Burn Level")
          })
          if (response1[response1.length - 1]) {
            RESPONSES.push(response.data.attributes[response1.length - 1].value)
            owners1.push(OWNERS[findIndex])
            tokenId.push(findIndex)
          }
        }
      } catch (error) {
        console.log(error)
      }
    }))
  }

  const filterMetaData = async () => {
    let data = []
    for (let index = 0; index < RESPONSES.length; index++) {
      console.log(RESULTS[index])
      data.push(RESPONSES[index])
    }
    setResult(data)
  }
  return (
    <div className='App'>
      <h3> Holder listings </h3>
      <ReactHTMLTableToExcel
        id="test-table-xls-button"
        className="download-table-xls-button"
        table="table-to-xls"
        filename="nftOwnerBurnLeveL"
        sheet="tablexls"
        buttonText="Download as XLS" />
      <h3>TOTAL_SUPPLY: {Supply}</h3>
      <table id="table-to-xls" style={{ textAlign: 'center', marginLeft: '500px', marginRight: '200px' }}>
        <tbody>
          <tr>
            <th>Sr</th>
            <th>Owners</th>
            <th>Burn Level</th>
          </tr>
          {RESPONSES && RESPONSES.length > 0 && RESPONSES.map((val, index) => {

            return (
              <tr key={index}>
                <td>{tokenId[index]}</td>
                <td>{owners1[index]}</td>
                <td>{val}</td>
              </tr>)
          })
          }
        </tbody>
      </table>
    </div>
  );
}

export default App;
