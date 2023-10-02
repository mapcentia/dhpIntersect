import {GithubPicker, AlphaPicker} from 'react-color';

class ColorPicker extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            displayColorPicker: false,
            color: this.props.color,
            alpha: {
                r:0,
                g:0,
                b:0,
                a:0.2
            }
        }
    }

    handeClick = () =>{
        this.setState({displayColorPicker : !this.state.displayColorPicker})
    }
    
    handleClose = () => {
        this.setState({displayColorPicker : false});
    }
    onChange = (color) => {
        this.setState({color:color.hex})
    }
    onChangeComplete = (color) => {
        this.setState({color: color.hex});
        this.props.changeColor(color.hex);
    }
    onAlphaChange = (alpha) =>{
        this.setState({alpha: alpha.rgb});
        this.props.changeAlpha(alpha.rgb.a);
    }

    render(){
        const popover = {
            position: 'absolute',
            zIndex: '2',
            background:"white",
            padding:"10px",
            border: "2px solid rgb(238, 238, 238)"
        }
        const cover = {
            position: 'fixed',
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
        }

        let colorPickerContainer = (
            <div style={popover}>
                <div style={cover} onClick={this.handleClose}></div>
                <div style={{position: "relative"}} className="dhp-colorpicker-container">
                    <GithubPicker color={this.state.color} triangle="hide" onChangeComplete={this.onChangeComplete} onChange={this.onChange} />
                    <AlphaPicker color={this.state.alpha} className="alpha-picker-tab" width={195} onChange={this.onAlphaChange} />
                </div>
            </div>
        )

        return <div style={{float:"right"}}>
            <button className="btn btn-default btn-raised btn-xs" alt="Vælg farve og gennemsigtighed" onClick={this.handeClick}><i className="fa fa-palette "></i> Juster farve og gennemsigtighed</button>
            {this.state.displayColorPicker ? colorPickerContainer: ''}
        </div>
    }
}

class IntersectLayer extends React.Component{
    constructor(props){
        super(props);
        let layer = null;
        var randomColor = '#'+Math.floor(Math.random()*16777215).toString(16);
        if(this.props.feature){
            layer = L.geoJSON(this.props.feature, {style: function(){
                return{
                    stroke: true,
                    color: randomColor,
                    weight: 4,
                    opacity: 1,
                    fill: true,
                    fillColor: randomColor,
                    fillOpacity: 0.2,
                    dashArray: '4 1 2'
                }
            },onEachFeature: (feat, lay) => {
              lay.bindPopup(() => {
                    var layerName = L.DomUtil.create('P');
                    layerName.innerText = this.props.feature.properties.selectedLayer.id +" -> " + this.props.feature.properties.targetLayer.id;
                    var removeLayeButton = L.DomUtil.create('BUTTON', "btn btn-default btn-raised btn-xs");
                    removeLayeButton.innerText = "Fjern overlappende opland";
                    removeLayeButton.onclick = () => {
                        console.log('state',this.state);
                        console.log('props',this.props);
                        this.state.layer.removeFrom(this.props.leafletMap);
                        //this.state.layer.removeFrom(this.props.leafletMap);
                        this.props.removeLayer(this.props.index);
                    }

                    var container = L.DomUtil.create('DIV');
                    container.appendChild(layerName);
                    container.appendChild(removeLayeButton);
                    return container;
              })
              lay.on('click', () => {
                if(!$('a[href="#dhp-intersection-content"]').parent().hasClass("active")){
                    $('a[href="#dhp-intersection-content"]').trigger('click');
                }
              })
              //lay.bindTooltip(this.props.feature.properties.selectedLayer.id +" -> " + this.props.feature.properties.targetLayer.id, {permanent: true, direction:"center"});
            }});
            this.addNonGroupLayers(layer, this.props.leafletMap);
            this.props.leafletMap.addLayer(layer);
        }
        this.state = {
            layer: this.dhpLayer,
            color: randomColor,
            opacity: 0.2,
            enabled: true
        }
    }

    addNonGroupLayers(sourceLayer, targetGroup) {
        var self = this;
        if (sourceLayer instanceof L.LayerGroup) {
            sourceLayer.eachLayer(function(layer) {
                self.addNonGroupLayers(layer, targetGroup);
            });
        } else {
            sourceLayer.options.editing = {};
            sourceLayer.dhpLayer = true;
            this.dhpLayer = sourceLayer;
            console.log('dhpLayer', sourceLayer)
            sourceLayer._vidi_type = "query_result";
            targetGroup.addLayer(sourceLayer);
        }
    }


    removeLayer = () => {
        this.state.layer.removeFrom(this.props.leafletMap);
        //this.state.layer.removeFrom(this.props.leafletMap);
        //this.state.layer.remove();
        this.props.removeLayer(this.props.index);
    }

    onChange = (e) =>{
        console.log(e.currentTarget.checked);
        this.setState({enabled: e.currentTarget.checked});
        if(e.currentTarget.checked){
            this.state.layer.addTo(this.props.leafletMap);
        }else{
            this.state.layer.removeFrom(this.props.leafletMap);
        }

        //this.props.toggleLayer(e.currentTarget.checked, this.props.index);
    }
    onMouseEnter = () => {
        this.state.layer.setStyle({
            color: this.state.color,
            fillColor: this.state.color,
            fillOpacity: 1
        })
    }

    onMouseLeave = () => {
        this.state.layer.setStyle({
            color: this.state.color,
            fillColor: this.state.color,
            fillOpacity: this.state.opacity
        })
    }

    changeColor = (color) => {
        this.setState({color: color});
        this.onMouseLeave();
    }

    changeAlpha = (opacity) => {
        this.state.layer.setStyle({
            fillOpacity: opacity
        });
        this.setState({opacity: opacity})
    }

    toggleLayer = () => {
        if(this.props.leafletMap.hasLayer(this.state.layer)){
            this.props.leafletMap.removeLayer(this.state.layer)
        }else{
            this.props.leafletMap.addLayer(this.state.layer)
        }
    }
    render(){
        return (
            <React.Fragment>
                <label style={{marginRight: "10px", width: "100%"}} htmlFor={"layer"+this.props.index} className="hide-print">
                    {/* <input type="checkbox" name={"layer"+this.props.index} value="enabled" checked={this.state.enabled} onChange={this.onChange}/> */}
                    <button className="btn btn-default btn-raised btn-xs pull-right" alt="Vis/Skjul overlap" onClick={this.toggleLayer}><i className="fa fa-eye"></i> Vis/Skjul </button>
                    <ColorPicker color={this.state.color} changeColor={this.changeColor} changeAlpha={this.changeAlpha}/>
                </label>
            </React.Fragment>
        )
    }
}

module.exports = IntersectLayer;
