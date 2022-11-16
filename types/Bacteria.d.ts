/**
 * The minimum fields for the program to work
 */
type BACTERIA_MIN = {
  ATCC?: string;
  ATCC_URL: string;
  className?: string;
  class?: string;
  ftp_path?: string;
  http_path?: string;
  unique_name?: string;
  infraspecific_name: string;
};

type BACTERIA_ALL = BACTERIA_MIN & {
  index?: number;
};
