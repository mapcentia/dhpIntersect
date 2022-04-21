import {GithubPicker} from 'react-color';

class ColorPicker extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            displayColorPicker: false,
            color: this.props.color
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

    render(){
        const popover = {
            position: 'absolute',
            zIndex: '2',
          }
          const cover = {
            position: 'fixed',
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
          }

        let colorPickerContainer = (
            <div  style={popover}>
                <div style={cover} onClick={this.handleClose}></div>
                <GithubPicker color={this.state.color} onChangeComplete={this.onChangeComplete} onChange={this.onChange} />
            </div>
        )

        return <React.Fragment>
            <i className="fa fa-palette pull-right" onClick={this.handeClick}></i>
            {this.state.displayColorPicker ? colorPickerContainer: ''}
        </React.Fragment>
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
                    layerName.innerText = "Overlap " + (parseInt(this.props.index) + 1);

                    var removeLayeButton = L.DomUtil.create('BUTTON', "btn btn-warning btn-xs");
                    removeLayeButton.innerText = "Fjern";
                    removeLayeButton.onclick = () => {
                        this.state.layer.removeFrom(this.props.leafletMap);
                        this.props.removeLayer(this.props.index);
                    }

                    var container = L.DomUtil.create('DIV');
                    container.appendChild(layerName);
                    container.appendChild(removeLayeButton);
                    return container;
              })
            }});
            this.props.leafletMap.addLayer(layer);
        }
        this.state = {
            layer: layer,
            color: randomColor,
            enabled: true
        }
    }

    removeLayer = () => {
        this.state.layer.removeFrom(this.props.leafletMap);
        this.state.layer.remove();
    }

    onChange = (e) =>{
        console.log(e.currentTarget.checked);
        this.setState({enabled: e.currentTarget.checked});
        if(e.currentTarget.checked){
            this.state.layer.addTo(this.props.leafletMap);
        }else{
            this.state.layer.removeFrom(this.props.leafletMap);
        }

        this.props.toggleLayer(e.currentTarget.checked, this.props.index);
    }
    onMouseEneter = () => {
        this.state.layer.setStyle({
            color: this.state.color,
            fillColor: this.state.color,
            fillOpacity: 1,
        })
    }

    onMouseLeave = () => {
        this.state.layer.setStyle({
            color: this.state.color,
            fillColor: this.state.color,
            fillOpacity: 0.2,
        })
    }

    changeColor = (color) => {
        this.setState({color: color});
        this.onMouseLeave();
    }

    render(){
        return (
            <React.Fragment>
                <label  style={{marginRight: "10px", width: "100%"}} htmlFor={"layer"+this.props.index} onMouseEnter={this.onMouseEneter} onMouseLeave={this.onMouseLeave}>
                    <input type="checkbox" name={"layer"+this.props.index} value="enabled" checked={this.state.enabled} onChange={this.onChange}/>
                    Lag {this.props.index + 1}
                    <ColorPicker color={this.state.color} changeColor={this.changeColor}/>
                </label>
            </React.Fragment>
        )
    }
}


const sumEconomyDataFunc = require('../../detailhandelsportalen/commonFunctions/sumEconomyValuesFunction')

var SocioeconomicTableComponent = require('../../detailhandelsportalen/browser/SocioeconomicTableComponent');
var EconomySummaryComponent = require('../../openrouteservice/browser/economysummary');

class IntersectionTree extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            polygons: null
        };
        this.componentRefArray = [];
    }

    componentDidUpdate(e, i){
        console.log(window.intersectionArray, this.props.intersectionLayers)
    }

    updateLayerValue = (value, index) => {
        //console.log(this.state.data.filter(e => e.enabled == true));
        let {polygons} = this.state;
        var polygonsCollect = polygons.map( (layer, layerIndex) => {
            if(layerIndex == index){
                return {
                    ...layer,
                    enabled: value
                }
            }else{
                return layer;
            }
        })
        this.setState({polygons: polygonsCollect});
        //console.log('call on me', this.state);
    }

    removeLayer = (index) => {
        let {polygons} = this.state;
        var polygonsCollect = polygons.map( (layer, layerIndex) => {
            if(layerIndex == index){
                return null;
            }else{
                return layer;
            }
        }).filter((e) => {
            return e != null;
        })

        if(polygonsCollect.length == 0){
            this.setState({polygons: null});
        }else{
            this.setState({polygons: polygonsCollect});
        }
        console.log('intersectTree.js: removeLayer: done removing layer', window.IntersectTree)
    }

    destroy = () => {
        this.state.polygons.forEach((feature, index) => {
            if(this.componentRefArray[index]){
                this.componentRefArray[index].removeLayer();
            }
            
        });
    }

    updateData = (data) => {
        console.log('updateData!',data);
        if(this.state.polygons != null){
            this.state.polygons.forEach((feature, index) => {
                this.componentRefArray[index].removeLayer();
                feature.layer.remove();
            });
        };
        this.setState({polygons:null});
        var structuredData = data.map(geom => {
            let obj = {
                feature: geom,
                layer: L.geoJSON(geom, {}),
                enabled: true,
                economyData: null,
                forbrugData: null
            }
            //this.props.leafletMap.addLayer(obj.layer);
            return obj;
        });

        $.when.apply($, structuredData.map((data) => {
            var reader = new jsts.io.GeoJSONReader();
            let convertedFeature = reader.read(data.feature).geometry.toText();

            return this.getEconomyData("isochrone", "dhp", {catchment: convertedFeature}).then((response) => {
                console.log(response);
                data.economyData = this.sumEconomyValues(response.features);
            }).then(()=> {
                return this.getForbrugData({catchment: convertedFeature}, "dhp").then((forbrugResponse) => {
                    data.forbrugData = forbrugResponse.features[0];
                })
            })
        })).then(() => {
            this.setState({polygons: structuredData});
            //console.log('all done!');
        })
        
        //console.log('finally done!',this.state);
    }

    getForbrugData(data, db){
        return $.ajax({
            method: "POST",
            url: `/api/extension/detailhandel/isochrone/${db}`,
            data: {
                    q: data,
                    srs: 4326,
                    lifetime: 0,
                    client_encoding: "UTF8",
                    key: null
            },
            error: function(e){
                console.log('Isochrone Ajax failed', e)
            }
        })
    }

    getEconomyData(type, db, geometry){
        var self = this;
        return $.ajax({
            method:"POST",
            url: `/api/extension/economyData`,
            data: {
                type: type,
                q: geometry,
                db: db,
                srs: 4326,
                lifetime: 0,
                client_encoding: "UTF8",
                key: null
            }/*,
            success: function(data){
                debugger;
                self.economyData = data;
                self.sortedEconomyData = self.sumEconomyValues(data.features);
                //console.log('data!', type, data);
            }*/,
            error: function(data){
                console.log('error!', data);
            }
        })
    }

    sumEconomyValues(values){
        return sumEconomyDataFunc(values);
    }

    sumForbrug(arg){
        var tempObj = {
            antal: 0,
            fb_beklaed:0, 
            fb_dagligv: 0,
            fb_oevrige: 0,
            fb_total: 0,
            oms_maks: 0,
            oms_min: 0
        };
        function convertToNumber(value){
            var val = parseInt(value);
            if(isNaN(val) || val == null){
                return 0; 
            }else{
                return val;
            }
        
        }
        arg.forEach((element, index) => {
            var short = element.forbrugData.properties;
            tempObj["antal"] += convertToNumber(short["antal"])
            tempObj["fb_beklaed"] += convertToNumber(short["fb_beklaed"])
            tempObj["fb_dagligv"] += convertToNumber(short["fb_dagligv"])
            tempObj["fb_oevrige"] += convertToNumber(short["fb_oevrige"])
            tempObj["fb_total"] += convertToNumber(short["fb_total"])
            tempObj["oms_maks"] += convertToNumber(short["oms_maks"])
            tempObj["oms_min"] += convertToNumber(short["oms_min"])
        })

        return tempObj;
    }

    render = () =>{
        let totalCount = 0;
        let enabledCount = 0;
        let renderData = (<div>Ingen data fundet</div>);
        let consumptionTable = (<div>Ingen forbrugs data fundet</div>);
        let socioeconomicTable= (<div>Ingen socioøkonomisk data fundet</div>);

        if(this.state.polygons != null && this.state.polygons.length > 0){
            renderData = this.state.polygons.map((e, i) => {
                return (
                    <React.Fragment>
                        <IntersectLayer feature={e.feature} key={i} ref={refer => {this.componentRefArray[i] =refer;}} index={i} toggleLayer={this.updateLayerValue} removeLayer={this.removeLayer} leafletMap={this.props.leafletMap} />
                        <hr key={"hr"+i} style={{margin:"10px 0"}} />
                    </React.Fragment>
                )
            });
        }

        if(this.state.polygons != null &&  this.state.polygons[0].economyData && this.state.polygons[0].forbrugData){
            var enabledFeatures = this.state.polygons.filter((e) => {
                return e.enabled;
            })

            totalCount = this.state.polygons.length;
            enabledCount = enabledFeatures.length;

            if(enabledFeatures.length > 0){
                let sumEconomyData = this.sumEconomyValues(enabledFeatures);
                let sumForbrug = this.sumForbrug(enabledFeatures);
                console.log({sumEconomyData:sumEconomyData, sumForbrug:sumForbrug})

                consumptionTable = <React.Fragment> <div className="social-economy-header">Forbrugstal</div> <EconomySummaryComponent calculatedEconomy={sumEconomyData.economyData} data={sumForbrug} /></React.Fragment>
                socioeconomicTable = <SocioeconomicTableComponent economy={sumEconomyData.economyData}/>
            }else{
                consumptionTable = (<div>Vælg overlap</div>);
                socioeconomicTable = '';
            }
        }

        let countText = (
        <p> Der blev fundet i alt {totalCount} overlap mellem de {enabledCount} tegnede oplande. </p>);

        let layerList = (<div className={"panel panel-default tab-pane"}>
        
            <div className="panel-heading"><h4 className="panel-title" >Overlappende polygoner</h4></div>
            <div className="panel-body"> 
                {totalCount > 0 ? countText : ''}
                {renderData}
                {this.state.polygons ? consumptionTable : ''}
                {this.state.polygons ? socioeconomicTable : ''}
            </div>
        </div>)

        return (
            <div>
                {renderData ? layerList: ''}
            </div>
        )
    }
}

module.exports = IntersectionTree;
