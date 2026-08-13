import wesker from "../images/weskerimpressed.png"
import { FaExternalLinkAlt } from "react-icons/fa";
import { useState } from "react";

import "./Schwarma.css"

import creek from "../images/creek2.png"
import ufcreek from "../images/supergeek.png"

import gluema from "../images/STOP MAKING GLUEMAS AND START RETAINING C6.pdf?url";

let pdf
let currentPage = 1

async function loadPdf (url) {
    pdf = await pdfjsLib
    
}

export default function Schwarma(){
    const [displayTierlist, setDisplayTierlist] = useState(false)
    const [ufCreek, setUfCreek] = useState(false)
    const [openPDF, setOpenPDF] = useState(false)


    return(
        <div className="Schwarma-Container">
            <h1>Charles Alan TT Schwarma Corner</h1>
            {/* <button onClick={ ()=>setDisplayTierlist(!displayTierlist)}>Show TT Tierlist</button>

            <div>
                {displayTierlist && <img src="https://uma.guide/img/guides/article/tt/tt_tierlist.webp" width="1000px"/>}
            </div> */}
            <button onClick={ ()=>setUfCreek(!ufCreek)}>Show UF Creek Guide</button>

            <div>
                {ufCreek && <img src={ufcreek} width="500em"/>}
            </div>

            <button onClick={()=> setOpenPDF(!openPDF)}>Open Guide PDF</button>

            {openPDF && <object
                data={`${gluema}#toolbar=0`}
                type="application/pdf"
                width="100%"
                height="600"
            />}

            
            <div className="DocLinkContainer">
                <h2>TT Doc</h2>
                <a className="external-link" href="https://docs.google.com/document/d/1wOcHD1SIicbdAMAyR8FXS3iKOcXlzm99QOte9ZEzJaM/edit?tab=t.0">
                    <FaExternalLinkAlt />
                </a>
            </div>
            <img src={wesker} width="250em"/>
        </div>
    )
}