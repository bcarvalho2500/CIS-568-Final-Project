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

		/*---------------------------------------------*/
		/* --- Data Filtering for Time Series Graph ---*/
		/*---------------------------------------------*/

		// Filter and group CSV cancer_data
		let filteredData = d3.group((data[1].filter(d=> {
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

		//console.log((filteredData));
		//console.log([...filteredData]);

		// Aggregate data based on year, and group by geoid
		let stateData = [];

		[...filteredData].forEach(d=>{

			const geoId = d[0];

			d[1].forEach((element, idx) => {
				let sum = 0
				let States = ''
				element.forEach( obj => {
					sum += Number(obj.Count)
					States = obj.States

				})
				stateData.push({ geoId: geoId, States: States, Count: sum, Year: new Date(idx) })
			})

		})
		// Group the data by GeoID
		const timeSeriesData = d3.group(stateData, d => d.geoId)


		/*-------------------------------------------------------*/
		/*-----------------Topojson Data handling----------------*/
		/*-------------------------------------------------------*/



		const topo_data = data[0].objects.gz_2010_us_040_00_20m;

		const geojson = topojson.feature(data[0], topo_data);

		//console.log(geojson.features);

		// Filter CSV cancer_data for map
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
		/*-------- Tooltip Creation & Svg for Time Series --------*/
		/*--------------------------------------------------------*/

		const tooltip = d3.select('#tooltip');
		const tooltipTS = d3.select('#tooltipTS');

		// Create a time series svg for the time series graph
		const dimsTS = {
			width: 300,
			height: 300
		}

		let svgTS = d3.select('#tooltipTS').append('svg');
		svgTS.attr("viewBox", `0 0 ${dimsTS.width} ${dimsTS.height}`);


		/*--------------------------------------------------------*/
		/*----------------- channelling marks --------------------*/
		/*--------------------------------------------------------*/

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
			.on("click", (mouseData,d)=>{
				let state
				let count

				try {
					state = mapData.get(d.properties.GEO_ID)[0].States
					count = mapData.get(d.properties.GEO_ID)[0].Count
				} catch (error) {
					state = 'No Data Available'
					count = 'No Data Available'
				}

					tooltip
						.style("opacity",.8)
						.style("left",(mouseData.clientX-200).toString()+"px")
						.style("top",(mouseData.clientY-30).toString()+"px")
						.html(
							"<div class='tooltipData'>State: "+state+"</div>" +
							"<div class='tooltipData'>Selection Count: "+count+"</div>" +
							"<div class='tooltipData'></div>");

				// Render the time series graph
				tooltipTS
					.style("left",(mouseData.clientX-200).toString()+"px")
					.style("top",(mouseData.clientY+10).toString()+"px")
					.style("opacity", .90);
				renderTimeSeries(svgTS, dimsTS, timeSeriesData.get(d.properties.GEO_ID)
					.sort(function(a, b){
					return a.Year-b.Year
				}));

			})
			.on('dblclick', (mouseData,d)=>{
				tooltip.transition()
					.duration(1000)
					.style("opacity", 0);
			tooltipTS.transition()
				.duration(1000)
				.style("opacity", 0);})
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

	})
}


function renderTimeSeries(svgTS, dimsTS, stateData){

	svgTS.selectAll("*").remove();

			/*----------------------------------------------*/
			/* Acquire extents for the variables of interest*/
			/*----------------------------------------------*/

			let yearExtent = d3.extent(stateData, d=>d.Year);
			let countExtent = d3.extent(stateData, d=>d.Count);

			//console.log(yearExtent);
			//console.log(countExtent);
			//console.log(stateData);
			//console.log(dimsTS);

			// Create the scale for Year
			const xScale = d3.scaleTime()
				.domain(yearExtent)
				.range([50, dimsTS.width-10]);

			// Create a scale for Count
			const yScale = d3.scaleLinear()
				.domain(countExtent)
				.range([dimsTS.height-30, 10]);


			/*----------------------------------------------*/
			/* Create Axis Generators ----------------------*/
			/*----------------------------------------------*/

			// Adding axis generator for x and y axes
			const xAxis = d3.axisBottom().scale(xScale);
			const yAxis = d3.axisLeft().scale(yScale);

			/*----------------------------------------------*/
			/* Append the Axes to the SVG ------------------*/
			/*----------------------------------------------*/

			// Append the x axis
			svgTS.append('g').attr("class", 'axis')
				.attr('transform', `translate(0, ${dimsTS.height - 30})`)
				.call(xAxis);

			// Append the first y axis
			svgTS.append('g').attr("class", 'axis')
				.attr('transform', `translate(${50}, 0)`)
				.call(yAxis);


			/*----------------------------------------------*/
			/* Create Line Generators ----------------------*/
			/*----------------------------------------------*/

			// Line generator for CO2
			const LineGeneratorCount = d3.line()
				.x(d=>xScale(d.Year))
				.y(d=>yScale(d.Count));


			/*----------------------------------------------*/
			/* Use the Line Generators ---------------------*/
			/*----------------------------------------------*/

			// Line for CO2

			const lineCount = svgTS.append('g').attr('class', 'count');
			lineCount.selectAll('count')
				.attr('class', 'timeSeries')
				.data([stateData])
				.enter()
				.append('path')
				.attr('d', d => LineGeneratorCount(d));


}





