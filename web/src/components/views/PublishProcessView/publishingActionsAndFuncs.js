import GitlabPipelinesApi from 'apis/GitlabPipelinesApi';
import JobsApi from 'apis/JobsApi';

const gitlabPipelinesApi = new GitlabPipelinesApi();

const jobsApi = new JobsApi();

const sortJobs = (unsortedJobs) => Array.from(
  new Set(unsortedJobs.map((job) => job.stage)),
).map((stage) => ({
  label: stage,
  jobs: unsortedJobs.filter((job) => job.stage === stage),
}));

const definePipeline = (projectId, pipelineId) => pipelineId
  ? gitlabPipelinesApi.getPipesById(projectId, pipelineId)
  : gitlabPipelinesApi.getPipesByProjectId(projectId)
    .then((pipes) => pipes.length > 0
      ? pipes.pop()
      : null);

const getPipelineJobs = (
  projectId,
  pipelineId,
) => definePipeline(projectId, pipelineId)
  .then((selectedPipeline) => selectedPipeline
    ? jobsApi.getJobsByPipelineId(projectId, selectedPipeline.id)
    : [],
  )
  .then((unsortedJobs) => unsortedJobs.length > 0
    ? sortJobs(unsortedJobs)
    : []);

export default {
  getPipelineJobs,
  sortJobs,
};
