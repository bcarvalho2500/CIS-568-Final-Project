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
}

function resetAgeGroups() {
	ageGroupsSelected = []
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
}

function resetYears() {
	yearsSelected = []
}
