import { Links, Link } from "react-router"
import spe from "../images/spe.png"
import "./TopBar.css"


export default function TopBar(){

    return(
        <div className="TopBar-Container">
            <Link to="/"> <img src={spe} width="60em"/></Link>

        </div>
    )
}