let cancerTypesSelected = ['All']
let ageGroupSelected = ['All']
let yearsSelected = ['All']

let cancerTypeCheckboxes = document.querySelectorAll(
	'input[type="checkbox"][name="cancer-type"]'
)

function toggleFilterContent(filterContentId) {
	var filterContent = document.getElementById(filterContentId)
	if (
		filterContent.style.display === 'none' &&
		(filterContentId === 'year-content' ||
			filterContentId === 'age-group-content')
	) {
		filterContent.style.display = 'grid'
	} else if (filterContent.style.display === 'none') {
		filterContent.style.display = 'block'
	} else {
		filterContent.style.display = 'none'
	}

	var filterContentButtons = document.getElementById(
		`${filterContentId}-buttons`
	)
	if (filterContentButtons.style.display === 'none') {
		filterContentButtons.style.display = 'flex'
	} else {
		filterContentButtons.style.display = 'none'
	}
}

function onSubmitCancerType(event) {
	event.preventDefault()
	cancerTypesSelected = []
	document
		.querySelectorAll('input[type="checkbox"][name="cancer-type"]')
		.forEach((item) => {
			if (item.checked) {
				cancerTypesSelected.push(item.value)
			}
		})
	console.log(cancerTypesSelected)
	renderMap(window_dims, margin, svg);
}

function resetCancerTypes() {
	cancerTypesSelected = []
}

function onSubmitAgeGroup(event) {
	event.preventDefault()
	ageGroupSelected = []
	document
		.querySelectorAll('input[type="checkbox"][name="age-group"]')
		.forEach((item) => {
			if (item.checked) {
				ageGroupSelected.push(item.value)
			}
		})
	console.log(ageGroupSelected)
	renderMap(window_dims, margin, svg);
}

function resetAgeGroups() {
	ageGroupSelected = []
}

function onSubmitYear(event) {
	event.preventDefault()
	yearsSelected = []
	document
		.querySelectorAll('input[type="checkbox"][name="year"]')
		.forEach((item) => {
			if (item.checked) {
				yearsSelected.push(item.value)
			}
		})
	console.log(yearsSelected)
	renderMap(window_dims, margin, svg);
}

function resetYears() {
	yearsSelected = []
}

// Function to draw and update map

function renderMap(window_dims, margin, svg){


	/*-------------------------------------------------------*/
	/*-----------------parallel load Data--------------------*/
	/*-------------------------------------------------------*/

	// A topojson file containing spatial coordinates for US states
	const US_States = "../Data/gz_2010_us_040_00_20m.topojson"
	// Cancer incidence Data in each state, by year, by age group
	const Cancer_Data = "../Data/Cancer_Data.csv"


	// open both files
	Promise.all([
		d3.json(US_States),
		d3.csv(Cancer_Data)
	]).then(data => {
		// topology Data

		// Store CSV Data in cancer
		//let cancer = data[1];


		/*-------------------------------------------------------*/
		/*-----------------Topojson Data handling----------------*/
		/*-------------------------------------------------------*/



		const topo_data = data[0].objects.gz_2010_us_040_00_20m;

		const geojson = topojson.feature(data[0], topo_data);

		//console.log(geojson.features);

		// Filter CSV cancer_data
		let test_Data = d3.group((data[1].filter(d=>{
			if(yearsSelected.includes(d.Year)){
				return true
			}
			else if(yearsSelected.includes("All")){
				return true
			}
		})
			.filter(d=> {
				if(ageGroupSelected.includes(d.Age_Groups)){
					return true
				}
				else if(ageGroupSelected.includes("All")){
					return true
				}
			})
			.filter(d=> {
				if(cancerTypesSelected.includes(d.Cancer_Sites)){
					return true
				}
				else if(cancerTypesSelected.includes("All")){
					return true
				}
			})), d=>d.GEOID);

		//console.log([...test_Data]);

		console.log([...test_Data]);

		const aggregation = [...test_Data].map(d=>
		{
			let sum = 0;
			const geoId = d[0]

			d[1].forEach(dd =>
			{
				sum = sum + Number(dd['Count'])
			})

			//console.log(sum)

			return ({'GEOID':geoId, 'States': d[1][0]['States'], 'Count': sum })
			})
		console.log(aggregation)

		const mapData = d3.group(aggregation, d=>d.GEOID)

		//console.log(mapData);
		//console.log(mapData.get("0400000US06")[0].Count)



		/*-------------------------------------------------------*/
		/*----------------geoPath generator----------------------*/
		/*-------------------------------------------------------*/


		const geoPath_generator = d3.geoPath()
			.projection(d3.geoAlbersUsa()
				.fitSize([window_dims.width - margin, window_dims.height - margin], geojson)
		)



		/*-------------------------------------------------------*/
		/*----------------------Color Scaling--------------------*/
		/*-------------------------------------------------------*/

		// Color scale
		var colorInterpolator = d3.interpolateRgbBasis(["white", "red"])

		// Value scale for filtered Data, to be colored by color scale
		let linearScaleCount = d3.scaleLinear()
			.domain(d3.extent(mapData, d=>d[1][0].Count))


		/*--------------------------------------------------------*/
		/*----------------- channelling marks --------------------*/
		/*--------------------------------------------------------*/

		// Append an SVG element to body, then append a path for the boundaries
		//let svg = d3.select('#map-container').append("svg")
		//	.attr("viewBox",`0 0 ${window_dims.width} ${window_dims.height}`)
		//	.attr("width", "60vw")
		//	.attr("height", "100%")


		svg.selectAll(".map").remove();
		svg.selectAll("path")
			.attr('class', 'map')
			.data(geojson.features)
			.enter()
			.append("path")
			.attr("d", d =>
				{
					return geoPath_generator(d)
				}
			)
			.attr("fill","white")
			.attr("stroke", "black")
			.on("mousemove", (mouseData,d)=>{
				let state
				let count

				try {
					state = mapData.get(d.properties.GEO_ID)[0].States
					count = mapData.get(d.properties.GEO_ID)[0].Count
				} catch (error) {
					state = 'No Data Available'
					count = 'No Data Available'
				}

				d3.select('#tooltip')
					.style("opacity",.8)
					.style("left",(mouseData.clientX+10).toString()+"px")
					.style("top",(mouseData.clientY+10).toString()+"px")
					.html(
						"<div class='tooltipData'>State: "+state+"</div>" +
						"<div class='tooltipData'>Count: "+count+"</div>" +
						"<div class='tooltipData'></div>")
			})
			.transition()
			.delay((_,i)=>i*2)
			.duration(1800)
			.style("fill", (d) => {
				try{
					// If a state has Data
					return colorInterpolator(linearScaleCount(mapData.get(d.properties.GEO_ID)[0].Count));
				}
				catch (error)
				{
					// In case a state has no Data
					return "steelblue";

					// Silverblue, steelblue, white
				}
			})

//style='color:red'



	})
}


function renderTimeSeries(){

	const Cancer_Data = "../Data/Cancer_Data.csv"
	d3.csv(Cancer_Data).then(
		data => {
			// Filter and group CSV cancer_data
			let filteredData = d3.group((data.filter(d=> {
					if(ageGroupSelected.includes(d.Age_Groups)){
						return true
					}
					else if(ageGroupSelected.includes("All")){
						return true
					}
				})
				.filter(d=> {
					if(cancerTypesSelected.includes(d.Cancer_Sites)){
						return true
					}
					else if(cancerTypesSelected.includes("All")){
						return true
					}
				})), d=>d.GEOID, d=>d.Year);

			console.log((filteredData));
			console.log([...filteredData]);

			let stateData = new Array();

			// Aggregate data based on year, and group by geoid
			 [...filteredData].forEach(d=>{
				console.log(d);

				const geoId = d[0];
				
				d[1].forEach((element, idx) => {
					let sum = 0
					element.forEach( obj => {
						sum += parseInt(obj.Count)

					})
					stateData.push({ geoid: geoId, Count: sum, year: idx })
				})
				
				console.log(stateData)
				console.log(stateData.filter((d) => d.geoid === '0400000US38'))
			})

			const aggregatedData = [...filteredData].map(d=>
			{
				let sum = 0;
				const geoId = d[0];

				d[1].forEach(dd =>
				{
					sum = sum + Number(dd['Count'])
				})

				//console.log(sum)

				return ({'GEOID':geoId, 'States': d[1][0]['States'], 'Count': sum })
			})






			//console.log(aggregatedData)

			const timeSeriesData = d3.group(aggregatedData, d=>d.GEOID);

			//console.log(timeSeriesData);


		}
	)
}



