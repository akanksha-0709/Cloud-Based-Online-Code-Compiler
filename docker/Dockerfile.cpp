# AWS Lambda C++ Executor
FROM public.ecr.aws/lambda/provided:al2

# Install GCC
RUN yum update -y && \
    yum groupinstall -y "Development Tools" && \
    yum install -y gcc-c++ && \
    yum clean all

# Install Python for Lambda runtime interface
RUN yum install -y python3 pip && \
    pip3 install awslambdaric

# Copy Lambda function code
COPY lambda-handlers/cpp-handler.py ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "cpp-handler.lambda_handler" ]
